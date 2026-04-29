import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppStore } from '../../store/StoreContext';
import { APP_COLORS } from '../../constants/colors';

function SettingRow({
  icon, title, subtitle, onPress, danger,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && { color: APP_COLORS.danger }]}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.rowArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const store = useAppStore();

  const handleExport = async () => {
    try {
      const json = store.exportData();
      const filename = `chicken-cottage-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = (FileSystem.documentDirectory ?? '') + filename;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Backup',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup saved', `Saved to:\n${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      const json = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert(
        'Restore Backup',
        'This will replace all current data with the backup. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: async () => {
              const success = await store.importData(json);
              if (success) {
                Alert.alert('✅ Restored', 'Backup restored successfully!');
              } else {
                Alert.alert(
                  '❌ Failed',
                  'Invalid backup file. Please use a valid Chicken Cottage Manager backup.'
                );
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Import failed', String(e));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all shifts and reset the app. This cannot be undone.\n\nExport a backup first!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Cleared', 'All data has been cleared. Please restart the app.');
          },
        },
      ]
    );
  };

  const staffCount = store.data.staff.length;
  const deliveryWeeks = store.data.deliverySchedules.length;
  const insideWeeks = store.data.insideSchedules.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App info */}
        <View style={styles.infoCard}>
          <Text style={styles.appName}>🐔 Chicken Cottage Manager</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{staffCount}</Text>
              <Text style={styles.statLabel}>Staff</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{deliveryWeeks}</Text>
              <Text style={styles.statLabel}>Delivery Weeks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{insideWeeks}</Text>
              <Text style={styles.statLabel}>Inside Weeks</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>BACKUP & RESTORE</Text>
        <View style={styles.section}>
          <SettingRow
            icon="📤"
            title="Export Backup"
            subtitle="Save all staff and shifts as a JSON file"
            onPress={handleExport}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📥"
            title="Restore Backup"
            subtitle="Import a previously exported backup file"
            onPress={handleImport}
          />
        </View>

        <Text style={styles.sectionHeader}>DANGER ZONE</Text>
        <View style={styles.section}>
          <SettingRow
            icon="🗑️"
            title="Clear All Data"
            subtitle="Delete all shifts and reset the app"
            onPress={handleClearData}
            danger
          />
        </View>

        <Text style={styles.footer}>
          Chicken Cottage Manager{'\n'}Made with ❤️ for the team
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  title: { color: APP_COLORS.text, fontSize: 20, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  appName: { color: APP_COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  appVersion: { color: APP_COLORS.textSecondary, fontSize: 13, marginBottom: 16 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { color: APP_COLORS.accent, fontSize: 24, fontWeight: '800' },
  statLabel: { color: APP_COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: APP_COLORS.border },
  sectionHeader: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 4,
  },
  section: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowIcon: { fontSize: 22, marginRight: 14 },
  rowText: { flex: 1 },
  rowTitle: { color: APP_COLORS.text, fontWeight: '600', fontSize: 15 },
  rowSubtitle: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  rowArrow: { color: APP_COLORS.textSecondary, fontSize: 20 },
  divider: { height: 1, backgroundColor: APP_COLORS.border, marginLeft: 52 },
  footer: {
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    lineHeight: 18,
  },
});
