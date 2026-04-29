import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../../store/StoreContext';
import { APP_COLORS } from '../../constants/colors';
import { ShiftGrid } from '../../components/ShiftGrid';
import { WeekSchedule } from '../../store/types';

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DeliveryScreen() {
  const store = useAppStore();
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()));

  const weekIso = currentMonday.toISOString();
  const schedule = store.getOrCreateSchedule('delivery', weekIso);
  const staff = store.getStaffForType('delivery');

  const goWeek = (delta: number) => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + delta * 7);
    setCurrentMonday(d);
  };

  const handleScheduleChange = useCallback((updated: WeekSchedule) => {
    store.saveSchedule(updated);
  }, [store]);

  if (store.loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={APP_COLORS.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛵 Delivery Shifts</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => goWeek(-1)}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => goWeek(1)}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ShiftGrid
        schedule={schedule}
        staff={staff}
        onScheduleChange={handleScheduleChange}
        getStaffById={store.getStaffById}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: APP_COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  title: {
    color: APP_COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  weekNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    backgroundColor: APP_COLORS.surface,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  navText: {
    color: APP_COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
