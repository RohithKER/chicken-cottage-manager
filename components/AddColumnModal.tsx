import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { APP_COLORS } from '../constants/colors';

interface AddColumnModalProps {
  visible: boolean;
  onAdd: (label: string) => void;
  onClose: () => void;
}

export function AddColumnModal({ visible, onAdd, onClose }: AddColumnModalProps) {
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setLabel('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.center}
      >
        <View style={styles.box}>
          <Text style={styles.title}>Add Column</Text>
          <Text style={styles.subtitle}>Enter a name for the new shift slot</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. 6:00, AFTERNOON..."
            placeholderTextColor={APP_COLORS.textSecondary}
            autoFocus
            onSubmitEditing={handleAdd}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: APP_COLORS.modal,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  title: {
    color: APP_COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  input: {
    backgroundColor: APP_COLORS.surface,
    color: APP_COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  cancelText: {
    color: APP_COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  addBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: APP_COLORS.accent,
    alignItems: 'center',
  },
  addText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
