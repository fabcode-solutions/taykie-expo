import { Alert } from "@/components/ui/Alert/Alert";
import { ALERT_CONSTANTS } from "@/constants/alert";
import { AlertConfig, AlertContextValue } from "@/types/alert";
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export const useAlert = (): AlertContextValue => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
  maxAlerts?: number;
  defaultPosition?: "top" | "bottom";
  defaultDuration?: number;
}

interface AlertItem extends AlertConfig {
  id: string;
  timer?: NodeJS.Timeout | number;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({
  children,
  maxAlerts = ALERT_CONSTANTS.MAX_VISIBLE_ALERTS,
  defaultPosition = "top",
  defaultDuration = ALERT_CONSTANTS.DEFAULT_DURATION,
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const alertIdCounter = useRef(0);

  // Generate unique ID for each alert
  const generateId = useCallback(() => {
    alertIdCounter.current += 1;
    return `alert-${alertIdCounter.current}-${Date.now()}`;
  }, []);

  // Show alert
  const show = useCallback(
    (config: Omit<AlertConfig, "id">): string => {
      const id = generateId();
      const duration = config.duration ?? defaultDuration;
      const position = config.position ?? defaultPosition;

      const newAlert: AlertItem = {
        ...config,
        id,
        position,
        duration,
      };

      // Set auto-dismiss timer if duration is specified
      if (duration > 0) {
        newAlert.timer = setTimeout(() => {
          hide(id as string);
        }, duration);
      }

      setAlerts((prevAlerts) => {
        // Remove oldest alerts if we've hit the max
        const updatedAlerts = [...prevAlerts];
        if (updatedAlerts.length >= maxAlerts) {
          const alertsToRemove = updatedAlerts.slice(0, updatedAlerts.length - maxAlerts + 1);
          alertsToRemove.forEach((alert) => {
            if (alert.timer) {
              clearTimeout(alert.timer);
            }
          });
          updatedAlerts.splice(0, updatedAlerts.length - maxAlerts + 1);
        }

        // Add new alert based on position
        if (position === "top") {
          return [newAlert, ...updatedAlerts];
        } else {
          return [...updatedAlerts, newAlert];
        }
      });

      return id;
    },
    [defaultDuration, defaultPosition, generateId, maxAlerts],
  );

  // Hide specific alert or the most recent one
  const hide = useCallback((id?: string) => {
    setAlerts((prevAlerts) => {
      const alertToRemove = id ? prevAlerts.find((alert) => alert.id === id) : prevAlerts[0];

      if (alertToRemove?.timer) {
        clearTimeout(alertToRemove.timer);
      }

      return prevAlerts.filter((alert) => alert.id !== (id || alertToRemove?.id));
    });
  }, []);

  // Hide all alerts
  const hideAll = useCallback(() => {
    setAlerts((prevAlerts) => {
      prevAlerts.forEach((alert) => {
        if (alert.timer) {
          clearTimeout(alert.timer);
        }
      });
      return [];
    });
  }, []);

  // Handle alert removal
  const handleRemove = useCallback((id: string) => {
    setAlerts((prevAlerts) => {
      const alert = prevAlerts.find((a) => a.id === id);
      if (alert?.timer) {
        clearTimeout(alert.timer);
      }
      return prevAlerts.filter((a) => a.id !== id);
    });
  }, []);

  const contextValue: AlertContextValue = {
    show,
    hide,
    hideAll,
  };

  // Group alerts by position
  const topAlerts = alerts.filter((alert) => alert.position === "top");
  const bottomAlerts = alerts.filter((alert) => alert.position === "bottom");

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {/* Top alerts */}
        {topAlerts.map((alert, index) => (
          <Alert key={alert.id} {...alert} index={index} onRemove={() => handleRemove(alert.id)} />
        ))}
        {/* Bottom alerts */}
        {bottomAlerts.map((alert, index) => (
          <Alert key={alert.id} {...alert} index={index} onRemove={() => handleRemove(alert.id)} />
        ))}
      </View>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
