import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  TasksResponse,
  CreateTaskRequest,
  UpdateTaskStatusRequest,
  ScheduleParams,
  ViewMode,
  CreateScheduleRequest,
  ScheduleResponse,
} from "@/types/schedule.types";
import { format } from "date-fns";
import { scheduleRepo } from "@/services/repositories/schedule";
import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";

const keys = {
  all: ["schedule"] as const,
  tasks: () => [...keys.all, "tasks"] as const,
  tasksByDate: (date: string, viewMode: ViewMode) => [...keys.tasks(), date, viewMode] as const,
  tasksByRange: (startDate: string, endDate: string, viewMode: ViewMode) =>
    [...keys.tasks(), "range", startDate, endDate, viewMode] as const,
};

export function useScheduleTasks(params: ScheduleParams) {
  const queryKey =
    params.startDate && params.endDate
      ? keys.tasksByRange(params.startDate, params.endDate, params.viewMode)
      : keys.tasksByDate(params.date ?? format(new Date(), "yyyy-MM-dd"), params.viewMode);

  return useQuery<TasksResponse>({
    queryKey,
    queryFn: () => scheduleRepo.getTasks(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => scheduleRepo.createTask(data),
    onSuccess: () => {
      // Invalidate all task queries to refetch data
      queryClient.invalidateQueries({ queryKey: keys.tasks() });
    },
    onError: (error) => {
      console.error("Failed to create task:", error);
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTaskStatusRequest) => scheduleRepo.updateTaskStatus(data),
    onSuccess: () => {
      // Invalidate all task queries to refetch data
      queryClient.invalidateQueries({ queryKey: keys.tasks() });
    },
    onError: (error) => {
      console.error("Failed to update task status:", error);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => scheduleRepo.deleteTask(taskId),
    onSuccess: () => {
      // Invalidate all task queries to refetch data
      queryClient.invalidateQueries({ queryKey: keys.tasks() });
    },
    onError: (error) => {
      console.error("Failed to delete task:", error);
    },
  });
}

// Helper hook for weekly data
export function useWeeklyTasks(startDate: string, endDate: string) {
  return useScheduleTasks({
    startDate,
    endDate,
    viewMode: "weekly",
  });
}

// Helper hook for daily data
export function useDailyTasks(date: string) {
  return useScheduleTasks({
    date,
    viewMode: "daily",
  });
}

export async function createSchedule(requestBody: CreateScheduleRequest): Promise<any> {
  return apiClient.post(endpoints.schedule.schedules, requestBody);
}
export async function getUserSchedules(
  page: number = 1,
  limit: number = 15,
): Promise<ScheduleResponse> {
  return apiClient.get(`${endpoints.schedule.schedules}?page=${page}&limit=${limit}`);
}
export async function getTodaySchedules(): Promise<ScheduleResponse> {
  return apiClient.get(endpoints.schedule.today_schedules);
}
export async function getScheduleById(scheduleId: string): Promise<any> {
  return apiClient.get(`${endpoints.schedule.today_schedules}/${scheduleId}`);
}

export async function markScheduleAsTaken(
  scheduleId: string,
  taken: boolean = false,
): Promise<any> {
  return apiClient.post(`${endpoints.schedule.schedules}/${scheduleId}`, { taken });
}
export async function updateSchedule(
  scheduleId: string,
  requestBody: CreateScheduleRequest,
): Promise<any> {
  return apiClient.put(`${endpoints.schedule.schedules}/${scheduleId}`, requestBody);
}
export async function deleteSchedule(scheduleId: string): Promise<any> {
  return apiClient.delete(`${endpoints.schedule.schedules}/${scheduleId}`);
}

export async function getScheduleHistory(
  scheduleId: string,
  page: number = 1,
  limit: number = 10,
): Promise<any> {
  return apiClient.get(
    `${endpoints.schedule.schedules}/${scheduleId}/history?page=${page}&limit=${limit}`,
  );
}

export async function markAsTaken(scheduleId: string): Promise<any> {
  return apiClient.post(`${endpoints.schedule.schedules}/${scheduleId}/mark`, { taken: true });
}
export async function markAsMissed(scheduleId: string): Promise<any> {
  return apiClient.post(`${endpoints.schedule.schedules}/${scheduleId}/mark`, { taken: false });
}

export async function getUpcomingReminder(): Promise<any> {
  return apiClient.get(endpoints.schedule.remind_upcoming);
}

export async function getUserStreak(): Promise<any> {
  return apiClient.get(endpoints.users.streak);
}

export async function createSnooze(scheduleId: string, durationMinutes: number): Promise<any> {
  return apiClient.post(`${endpoints.schedule.schedules}/${scheduleId}/snooze`, {
    durationMinutes,
  });
}
