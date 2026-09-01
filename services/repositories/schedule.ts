import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import {
  TasksResponse,
  CreateTaskRequest,
  UpdateTaskStatusRequest,
  ScheduleParams,
  Task,
} from "@/types/schedule.types";

export const scheduleRepo = {
  async getTasks(params: ScheduleParams): Promise<TasksResponse> {
    const search = new URLSearchParams();

    if (params.date) search.set("date", params.date);
    if (params.startDate) search.set("startDate", params.startDate);
    if (params.endDate) search.set("endDate", params.endDate);
    search.set("viewMode", params.viewMode);

    const path = search.toString()
      ? `${endpoints.schedule.tasks}?${search.toString()}`
      : endpoints.schedule.tasks;

    return apiClient.get<TasksResponse>(path);
  },

  async createTask(data: CreateTaskRequest): Promise<{ success: boolean; task: Task }> {
    return apiClient.post<{ success: boolean; task: Task }>(endpoints.schedule.tasks, data);
  },

  async updateTaskStatus(data: UpdateTaskStatusRequest): Promise<{ success: boolean; task: Task }> {
    return apiClient.patch<{ success: boolean; task: Task }>(
      endpoints.schedule.taskStatus(data.taskId),
      {
        status: data.status,
        takenAt: data.takenAt,
      },
    );
  },

  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(endpoints.schedule.task(taskId));
  },

  async getTasksByDateRange(startDate: string, endDate: string): Promise<TasksResponse> {
    return this.getTasks({
      startDate,
      endDate,
      viewMode: "weekly",
    });
  },
};
