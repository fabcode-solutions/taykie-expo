import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  children: React.ReactNode;
  // Optional label so a crash log points at the screen that failed
  // (e.g. "Community") instead of just "ErrorBoundary".
  name?: string;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render-time exception anywhere below (e.g. a
// malformed post from the API making a child read a property off
// undefined) unmounts the whole React tree — on a release build that reads
// to the user as the app silently closing, with nothing to recover from
// but a manual relaunch.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`💥 [ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#111",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default ErrorBoundary;
