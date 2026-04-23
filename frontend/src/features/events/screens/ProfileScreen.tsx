import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, Alert } from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import FastImage from 'react-native-fast-image';
import * as ImagePicker from 'react-native-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../auth/store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { categoryThemes, CategoryTheme } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import Icon from '../../../shared/components/AppIcon';
import { apiClient } from '../../../shared/api/client';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';
import { EventsStackParamList, AppTabsParamList } from '../../../navigation/types';

type ProfileNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList>,
  StackNavigationProp<EventsStackParamList>
>;

interface Props {
  adminTheme?: CategoryTheme;
}

export default function ProfileScreen({ adminTheme }: Props) {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, logout, updateUser } = useAuthStore();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const categoryTheme = categoryThemes[activeCategory];
  const theme = adminTheme || categoryTheme;
  const isAdmin = !!adminTheme;

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editGender, setEditGender] = useState<string>(user?.gender || '');
  const [editDob, setEditDob] = useState<Date | undefined>(user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined);
  const [editHobbies, setEditHobbies] = useState<string[]>(user?.hobbies || []);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditGender(user?.gender || '');
    setEditDob(user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined);
    setEditHobbies(user?.hobbies || []);
    setShowEditModal(true);
  };

  const handleAvatarPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets[0]?.uri) {
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as any);

        const response = await apiClient.patch('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const updatedUser = response.data?.data;
        if (updatedUser?.avatar) {
          updateUser({ ...user, avatar: updatedUser.avatar } as any);
          setAvatarPreview(updatedUser.avatar);
        }
      }
    } catch (error: any) {
      console.log('Avatar pick error:', error);
      const errorMsg = error?.response?.data?.error?.message || '';
      const isCloudError = errorMsg.includes('Cloudinary') || errorMsg.includes('upload');
      
      triggerGlobalAlert({
        type: 'error',
        title: 'UPLOAD FAILED',
        message: isCloudError 
          ? 'Image upload service not configured. Please try again later.'
          : (error?.response?.data?.error?.message || 'Could not upload avatar. Try again.'),
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const [showHobbyInput, setShowHobbyInput] = useState(false);
  const [newHobby, setNewHobby] = useState('');

  const addHobby = () => {
    if (newHobby.trim() && !editHobbies.includes(newHobby.trim())) {
      setEditHobbies([...editHobbies, newHobby.trim()]);
      setNewHobby('');
    }
    setShowHobbyInput(false);
  };

  const saveProfile = async () => {
    if (isSaving) return;
    if (!editName.trim()) {
      triggerGlobalAlert({
        type: 'warning',
        title: 'INVALID NAME',
        message: 'Name cannot be empty',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.patch('/users/me', {
        name: editName.trim(),
        gender: editGender || undefined,
        dateOfBirth: editDob?.toISOString(),
        hobbies: editHobbies,
      });

      const updatedUser = response.data?.data;
      if (updatedUser) {
        updateUser(updatedUser);
      }

      setShowEditModal(false);
      triggerGlobalAlert({
        type: 'success',
        title: 'PROFILE UPDATED',
        message: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      triggerGlobalAlert({
        type: 'error',
        title: 'UPDATE FAILED',
        message: error?.response?.data?.error?.message || 'Could not update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const items = [
    { icon: 'user', title: 'Edit Profile', subtitle: 'Update name, gender & DOB', action: 'edit' },
    { icon: 'bookmark', title: 'My Saved', subtitle: 'Open your saved and created events', action: 'saved' },
    { icon: 'calendar', title: 'My RSVPs', subtitle: 'View your joined events & codes', action: 'rsvps' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{isAdmin ? 'Admin Profile' : 'Profile'}</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
        <TouchableOpacity style={styles.avatarSection} onPress={handleAvatarPick} disabled={isUploadingAvatar}>
          {avatarPreview || user?.avatar ? (
            <FastImage source={{ uri: avatarPreview || user?.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarPlaceholderText}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: theme.accent }]}>
            <Icon name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.userName, { color: theme.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.accent }]}>{user?.joinedEvents?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Attended</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.accent }]}>{user?.createdEvents?.length || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Created</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuList}>
        {items.map((item) => (
          <TouchableOpacity 
            key={item.title} 
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border.color }]}
            onPress={() => {
              if (item.action === 'rsvps') {
                navigation.navigate('JoinedEvents');
              } else if (item.action === 'saved') {
                navigation.navigate('MyEvents');
              } else if (item.action === 'edit') {
                navigation.navigate('EditProfile');
              }
            }}
            disabled={!item.action}
          > 
            <View style={[styles.menuIconWrap, { backgroundColor: `${theme.accent}22` }]}>
              <Icon name={item.icon} size={16} color={theme.accent} />
            </View>
            <View style={styles.menuTextBlock}>
              <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: theme.surface }]} 
        onPress={() => {
          Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ]);
}}
      >
        <View style={styles.logoutContent}>
          <Text style={[styles.logoutText, { color: '#EF4444' }]}>Logout</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showEditModal} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="x" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={isSaving}>
              <Text style={{ color: isSaving ? theme.textSecondary : theme.accent, fontWeight: '600' }}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border.color }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Gender</Text>
              <View style={styles.genderOptions}>
                {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderOption,
                      { borderColor: theme.border.color },
                      editGender === g && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setEditGender(g)}
                  >
                    <Text style={{ color: editGender === g ? '#FFFFFF' : theme.textPrimary, fontSize: 13 }}>
                      {g.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: theme.border.color }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: editDob ? theme.textPrimary : theme.textSecondary }}>
                  {editDob ? format(editDob, 'MMMM d, yyyy') : 'Select date of birth'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={editDob || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setEditDob(date);
                  }}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Hobbies</Text>
              <View style={styles.hobbiesContainer}>
                {editHobbies.map((hobby) => (
                  <TouchableOpacity
                    key={hobby}
                    style={[styles.hobbyTag, { backgroundColor: theme.accent + '20' }]}
                    onPress={() => setEditHobbies(editHobbies.filter((h) => h !== hobby))}
                  >
                    <Text style={{ color: theme.accent, fontSize: 13 }}>{hobby}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.addHobbyButton, { backgroundColor: theme.accent }]} onPress={addHobby}>
                  <Icon name="plus" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  headerRow: { paddingTop: 52, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800' },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarSection: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  userEmail: { fontSize: 14, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 32 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  menuList: { gap: 10, marginTop: 24 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuTextBlock: { flex: 1, marginLeft: 12, marginRight: 8 },
  menuTitle: { fontSize: 17, fontWeight: '700' },
  menuSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '500' },
  logoutButton: { 
    marginTop: 24, 
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  genderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  hobbiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addHobbyButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});