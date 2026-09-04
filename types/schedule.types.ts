import { ApiResponse } from "./api.types";
import { Medication } from "./products.types";

export type TaskStatus = "taken" | "missed" | "upcoming";
export type ViewMode = "daily" | "weekly";
export type FrequencyType = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  time: string;
  status: TaskStatus;
  emoji: string;
  date: string; // ISO date string (YYYY-MM-DD)
  medicationId: string;
  frequency: FrequencyType;
  dosage?: string;
  strength?: string;
  notes?: string;
}

export interface TasksByDate {
  [date: string]: Task[];
}

export interface WeeklyTaskSummary {
  date: string;
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  completionRate: number;
}

export interface ScheduleParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  viewMode: ViewMode;
}

export interface TasksResponse {
  success: boolean;
  message: string;
  data: Task[];
  meta?: {
    totalCount: number;
    completedCount: number;
    missedCount: number;
    upcomingCount: number;
  };
  timestamp: string;
}

export interface CreateTaskRequest {
  medicationId: string;
  title: string;
  time: string;
  frequency: FrequencyType;
  startDate: string;
  dosage?: string;
  strength?: string;
  notes?: string;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: TaskStatus;
  takenAt?: string; // ISO timestamp
}

export interface CreateScheduleRequest {
  productId?: string;
  name: string;
  dosage?: string;
  strength?: string;
  scheduleDay?: string;
  scheduleDayOfMonth?: number;
  scheduleTime?: string;
  remindersPush?: boolean;
  remindersLed?: boolean;
  remindersSound?: boolean;
  scheduleType?: FrequencyType;
}

export interface Schedule extends CreateScheduleRequest {
  scheduleId?: string;
  id?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  status: TaskStatus;
  product?: Medication;
  time?: string;
  time24?: string;
}

export interface UpcomingReminderData {
  hasUpcoming: boolean;
  scheduleId: string;
  name: string;
  nextDoseTime: string;
  minutesLeft: number;
  secondsLeft: number;
  countdownLabel: string;
}

export interface UserStreakData {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  totalPerfectDays: number;
  todayComplete: boolean;
}

export interface LogsData {
  id: string;
  userId: string;
  scheduleId: string;
  note: string;
  status: string;
  logDate: string;
  createdAt: string;
  updatedAt: string;
  schedule: {
    id: string;
    name: string;
  };
}

export type ScheduleResponse = ApiResponse<Schedule[]>;
