import { format, addDays, startOfWeek, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { Task, WeeklyTaskSummary, TasksByDate, ViewMode } from "@/types/schedule.types";

/**
 * Groups tasks by date for easier processing
 */
export function groupTasksByDate(tasks: Task[]): TasksByDate {
  return tasks.reduce((acc, task) => {
    const date = task.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as TasksByDate);
}

/**
 * Filters tasks by a specific date
 */
export function filterTasksByDate(tasks: Task[], targetDate: Date): Task[] {
  const targetDateString = format(targetDate, "yyyy-MM-dd");
  return tasks.filter((task) => task.date === targetDateString);
}

/**
 * Filters tasks within a date range
 */
export function filterTasksByDateRange(tasks: Task[], startDate: Date, endDate: Date): Task[] {
  return tasks.filter((task) => {
    const taskDate = parseISO(task.date);
    return isWithinInterval(taskDate, { start: startDate, end: endDate });
  });
}

/**
 * Generates weekly task summary data for the weekly view
 */
export function generateWeeklyTaskSummary(tasks: Task[], weekStartDate: Date): WeeklyTaskSummary[] {
  const weekDays = generateWeekDates(weekStartDate);
  const tasksByDate = groupTasksByDate(tasks);

  return weekDays.map((date) => {
    const dateString = format(date, "yyyy-MM-dd");
    const dayTasks = tasksByDate[dateString] || [];
    const completedCount = dayTasks.filter((task) => task.status === "taken").length;
    const totalCount = dayTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      date: dateString,
      tasks: dayTasks.sort((a, b) => a.time.localeCompare(b.time)), // Sort by time
      completedCount,
      totalCount,
      completionRate,
    };
  });
}

/**
 * Generates array of dates for a week starting from Monday
 */
export function generateWeekDates(referenceDate: Date): Date[] {
  const startOfWeekDate = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday

  return Array.from({ length: 7 }, (_, index) => addDays(startOfWeekDate, index));
}

/**
 * Generates date cells for the weekly calendar view
 */
export interface DayCell {
  date: Date;
  weekday: string;
  dayNumber: string;
  isToday: boolean;
  hasTasks: boolean;
  completionRate: number;
}

export function generateWeekCalendarData(referenceDate: Date, tasks: Task[] = []): DayCell[] {
  const weekDates = generateWeekDates(referenceDate);
  const tasksByDate = groupTasksByDate(tasks);
  const today = new Date();

  return weekDates.map((date) => {
    const dateString = format(date, "yyyy-MM-dd");
    const dayTasks = tasksByDate[dateString] || [];
    const completedCount = dayTasks.filter((task) => task.status === "taken").length;
    const totalCount = dayTasks.length;

    return {
      date,
      weekday: format(date, "EE").toUpperCase(),
      dayNumber: format(date, "d"),
      isToday: isSameDay(date, today),
      hasTasks: dayTasks.length > 0,
      completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    };
  });
}

/**
 * Gets the optimal date range for API calls based on view mode
 */
export function getDateRangeForView(
  selectedDate: Date,
  viewMode: ViewMode,
): { startDate: string; endDate: string } {
  if (viewMode === "daily") {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    return {
      startDate: dateString,
      endDate: dateString,
    };
  }

  // Weekly view
  const startOfWeekDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const endOfWeekDate = addDays(startOfWeekDate, 6);

  return {
    startDate: format(startOfWeekDate, "yyyy-MM-dd"),
    endDate: format(endOfWeekDate, "yyyy-MM-dd"),
  };
}

/**
 * Calculates overall statistics for tasks
 */
export interface TaskStatistics {
  total: number;
  completed: number;
  missed: number;
  upcoming: number;
  completionRate: number;
  onTime: number;
}

export function calculateTaskStatistics(tasks: Task[]): TaskStatistics {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "taken").length;
  const missed = tasks.filter((task) => task.status === "missed").length;
  const upcoming = tasks.filter((task) => task.status === "upcoming").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    missed,
    upcoming,
    completionRate,
    onTime: completed, // Could be enhanced to track actual timing
  };
}

/**
 * Sorts tasks by time for proper display order
 */
export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Convert time strings like "8:00 AM" to comparable format
    const timeA = convertTimeStringTo24Hour(a.time);
    const timeB = convertTimeStringTo24Hour(b.time);
    return timeA.localeCompare(timeB);
  });
}

/**
 * Converts 12-hour time format to 24-hour for sorting
 */
function convertTimeStringTo24Hour(timeString: string): string {
  const [time, period] = timeString.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (period?.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  } else if (period?.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Debounce function for optimizing API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => func(...args), wait);
  };
}
