#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

// Color output helpers
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
};

class DeployScript {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, "package.json");
    this.appJsonPath = path.join(this.projectRoot, "app.json");
    this.dryRun = process.argv.includes("--dry-run");
  }

  // Utility methods
  execCommand(command, options = {}) {
    if (this.dryRun) {
      log.info(`[DRY RUN] Would execute: ${command}`);
      return "";
    }
    try {
      return execSync(command, {
        stdio: options.silent ? "pipe" : "inherit",
        encoding: "utf8",
        ...options,
      });
    } catch (error) {
      log.error(`Command failed: ${command}`);
      log.error(error.message);
      process.exit(1);
    }
  }

  async execCommandAsync(command, options = {}) {
    if (this.dryRun) {
      log.info(`[DRY RUN] Would execute: ${command}`);
      return { stdout: "", stderr: "", code: 0 };
    }

    const parts = command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    return new Promise((resolve, reject) => {
      const child = spawnSync(cmd, args, {
        stdio: options.silent ? "pipe" : "inherit",
        encoding: "utf8",
        ...options,
      });

      if (child.error) {
        reject(child.error);
      } else {
        resolve({
          stdout: child.stdout || "",
          stderr: child.stderr || "",
          code: child.status,
        });
      }
    });
  }

  readJsonFile(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      log.error(`Failed to read ${filePath}: ${error.message}`);
      process.exit(1);
    }
  }

  writeJsonFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
      log.success(`Updated ${path.basename(filePath)}`);
    } catch (error) {
      log.error(`Failed to write ${filePath}: ${error.message}`);
      process.exit(1);
    }
  }

  getCurrentVersion() {
    const packageJson = this.readJsonFile(this.packageJsonPath);
    return packageJson.version;
  }

  incrementVersion(version, type) {
    const [major, minor, patch] = version.split(".").map(Number);

    switch (type) {
      case "major":
        return `${major + 1}.0.0`;
      case "minor":
        return `${major}.${minor + 1}.0`;
      case "patch":
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
  }

  updateVersionInFiles(newVersion) {
    // Update package.json
    const packageJson = this.readJsonFile(this.packageJsonPath);
    packageJson.version = newVersion;
    this.writeJsonFile(this.packageJsonPath, packageJson);

    // Update app.json
    const appJson = this.readJsonFile(this.appJsonPath);
    appJson.expo.version = newVersion;
    this.writeJsonFile(this.appJsonPath, appJson);
  }

  async getEASBuildNumbers() {
    log.step("Fetching EAS build numbers...");

    try {
      const result = await this.execCommandAsync(
        "eas build:version:get -p all --json --non-interactive",
        { silent: true },
      );

      if (result.code !== 0) {
        log.warn("Could not fetch EAS build numbers, using fallback");
        return { buildNumber: "1", versionCode: "1" };
      }

      const buildInfo = JSON.parse(result.stdout.trim());
      log.success(`iOS build: ${buildInfo.buildNumber}, Android build: ${buildInfo.versionCode}`);

      return buildInfo;
    } catch (error) {
      log.warn("Could not fetch EAS build numbers, using fallback");
      return { buildNumber: "1", versionCode: "1" };
    }
  }

  getExistingBuildTags(version) {
    try {
      const output = this.execCommand(`git tag -l "${version}+*"`, { silent: true });
      return output.trim().split("\n").filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  getNextBuildNumber(version) {
    const existingTags = this.getExistingBuildTags(version);
    if (existingTags.length === 0) {
      return 1;
    }

    const buildNumbers = existingTags.map((tag) => {
      const match = tag.match(/\+ios(\d+)\+and(\d+)$/);
      if (match) {
        return Math.max(parseInt(match[1]), parseInt(match[2]));
      }
      return 0;
    });

    return Math.max(...buildNumbers) + 1;
  }

  async startGitFlowRelease(version) {
    log.step(`Starting git flow release: ${version}`);
    this.execCommand(`git flow release start ${version}`);
  }

  async finishGitFlowRelease(version) {
    log.step(`Finishing git flow release: ${version}`);
    this.execCommand(`git flow release finish ${version} -m "Release ${version}"`);
  }

  async commitVersionChanges(version) {
    log.step("Committing version changes...");
    this.execCommand("git add package.json app.json");
    this.execCommand(`git commit -m "Bump version to ${version}"`);
  }

  async pushChanges() {
    log.step("Pushing changes...");
    this.execCommand("git push origin develop main --tags");
  }

  async triggerEASBuild(profile = "production") {
    log.step(`Triggering EAS build (${profile})...`);
    this.execCommand(`eas build --platform all --profile ${profile} --non-interactive`);
  }

  async submitToStores(platform = "all") {
    log.step(`Submitting to stores (${platform})...`);
    this.execCommand(`eas submit --platform ${platform} --non-interactive`);
  }

  async deployWeb(env = "production") {
    log.step(`Building web export...`);
    this.execCommand("npx expo export --platform web");

    log.step(`Deploying web (${env})...`);
    if (env === "production") {
      this.execCommand("eas deploy --prod");
    } else {
      this.execCommand("eas deploy"); // staging/preview
    }

    log.success(`Web deployed to ${env}!`);
  }

  // Main release methods
  async releaseVersion(type) {
    log.header(`🚀 Starting ${type} release`);

    const currentVersion = this.getCurrentVersion();
    const newVersion = this.incrementVersion(currentVersion, type);

    log.info(`Version: ${currentVersion} → ${newVersion}`);

    if (this.dryRun) {
      log.info("[DRY RUN] Would perform version release");
      return;
    }

    // Get current build numbers and predict next ones
    const currentBuildInfo = await this.getEASBuildNumbers();
    const nextIosBuild = parseInt(currentBuildInfo.buildNumber) + 1;
    const nextAndroidBuild = parseInt(currentBuildInfo.versionCode) + 1;

    // Use simple format if build numbers match, compound if different
    const buildTag =
      nextIosBuild === nextAndroidBuild
        ? `${newVersion}+${nextIosBuild}`
        : `${newVersion}+ios${nextIosBuild}+and${nextAndroidBuild}`;

    log.info(`Predicted build tag: ${buildTag}`);

    // Git flow release process
    await this.startGitFlowRelease(newVersion);

    // Update version files
    this.updateVersionInFiles(newVersion);

    // Commit changes
    await this.commitVersionChanges(newVersion);

    // Finish git flow release
    await this.finishGitFlowRelease(newVersion);

    // Tag with predicted build numbers
    this.execCommand(`git tag ${buildTag}`);

    // Push everything
    await this.pushChanges();

    log.success(`${type} release completed: ${buildTag}`);
    log.info("GitHub Actions will trigger EAS builds automatically");
  }

  async releaseBuild() {
    log.header("🔨 Starting build release");

    const currentVersion = this.getCurrentVersion();
    log.info(`Creating build for version: ${currentVersion}`);

    if (this.dryRun) {
      log.info("[DRY RUN] Would perform build release");
      return;
    }

    // Get current build numbers and predict next ones
    const currentBuildInfo = await this.getEASBuildNumbers();
    const nextIosBuild = parseInt(currentBuildInfo.buildNumber) + 1;
    const nextAndroidBuild = parseInt(currentBuildInfo.versionCode) + 1;

    // Use simple format if build numbers match, compound if different
    const buildTag =
      nextIosBuild === nextAndroidBuild
        ? `${currentVersion}+${nextIosBuild}`
        : `${currentVersion}+ios${nextIosBuild}+and${nextAndroidBuild}`;

    log.info(`Predicted build tag: ${buildTag}`);

    // Start git flow release (no commits will be made)
    await this.startGitFlowRelease(buildTag);

    // Finish git flow release immediately (no commits)
    await this.finishGitFlowRelease(buildTag);

    // Push changes
    await this.pushChanges();

    log.success(`Build release completed: ${buildTag}`);
    log.info("GitHub Actions will trigger EAS builds automatically");
  }

  async build(profile = "production", platform = "all") {
    log.header(`🔧 Building (${profile}, ${platform})`);

    if (platform === "all") {
      await this.triggerEASBuild(profile);
    } else {
      this.execCommand(`eas build --platform ${platform} --profile ${profile} --non-interactive`);
    }

    log.success("Build completed!");
  }

  async submit(platform = "all") {
    log.header(`📱 Submitting to stores (${platform})`);
    await this.submitToStores(platform);
    log.success("Submission completed!");
  }

  async web(env = "production") {
    log.header(`🌐 Deploying web (${env})`);
    await this.deployWeb(env);
    log.success("Web deployment completed!");
  }

  async full(type, platform = "all") {
    log.header(`🎯 Full ${type} deployment (${platform})`);

    await this.releaseVersion(type);

    log.info("Builds will be available in TestFlight/Internal Testing once CI completes");
    log.info("Submit to stores with: yarn deploy submit");
    log.success("Full deployment completed!");
  }

  showHelp() {
    console.log(`
${colors.bright}Taykie Deploy Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  yarn deploy <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}release${colors.reset} <major|minor|patch|build>  Create a new release
  ${colors.green}build${colors.reset} [profile] [--platform <platform>]  Trigger EAS build
  ${colors.green}submit${colors.reset} [--platform <platform>]     Submit to stores
  ${colors.green}web${colors.reset} [--env <env>]                  Build web version
  ${colors.green}full${colors.reset} <major|minor|patch> [--platform <platform>]  Complete release flow

${colors.cyan}Options:${colors.reset}
  --platform <ios|android|all>   Target platform (default: all)
  --env <staging|production>      Environment (default: production)
  --dry-run                       Show what would be done without executing

${colors.cyan}Examples:${colors.reset}
  yarn deploy release patch       # Create patch release (1.0.0 → 1.0.1+ios1+and1)
  yarn deploy release build       # Create build of current version (1.0.1+ios2+and2)
  yarn deploy build production    # Trigger production build
  yarn deploy submit --platform ios  # Submit iOS build to App Store
  yarn deploy web --env staging   # Deploy web to staging environment
  yarn deploy full minor          # Complete minor release flow

${colors.cyan}Git Flow Integration:${colors.reset}
  • All releases use git flow release branches
  • Version releases commit version changes, build releases don't
  • Build numbers are predicted and tagged immediately
  • GitHub Actions triggers EAS builds automatically from main
  • All releases push to develop, main, and tags
    `);
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "help" || command === "--help" || command === "-h") {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case "release": {
          const type = args[1];
          if (!type || !["major", "minor", "patch", "build"].includes(type)) {
            log.error("Invalid release type. Use: major, minor, patch, or build");
            process.exit(1);
          }

          if (type === "build") {
            await this.releaseBuild();
          } else {
            await this.releaseVersion(type);
          }
          break;
        }

        case "build": {
          const profile = args[1] || "production";
          const platformIndex = args.indexOf("--platform");
          const platform = platformIndex !== -1 ? args[platformIndex + 1] : "all";
          await this.build(profile, platform);
          break;
        }

        case "submit": {
          const platformIndex = args.indexOf("--platform");
          const platform = platformIndex !== -1 ? args[platformIndex + 1] : "all";
          await this.submit(platform);
          break;
        }

        case "web": {
          const envIndex = args.indexOf("--env");
          const env = envIndex !== -1 ? args[envIndex + 1] : "production";
          await this.web(env);
          break;
        }

        case "full": {
          const type = args[1];
          if (!type || !["major", "minor", "patch"].includes(type)) {
            log.error("Invalid release type for full deployment. Use: major, minor, or patch");
            process.exit(1);
          }

          const platformIndex = args.indexOf("--platform");
          const platform = platformIndex !== -1 ? args[platformIndex + 1] : "all";
          await this.full(type, platform);
          break;
        }

        default:
          log.error(`Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      log.error(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the script
const deploy = new DeployScript();
deploy.run().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
