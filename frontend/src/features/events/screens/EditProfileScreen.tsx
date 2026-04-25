import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../auth/store/authStore';
import { useEventsStore } from '../store/eventsStore';
import { categoryThemes } from '../../../shared/theme/categoryThemes';
import { EventCategory } from '../types';
import Icon from '../../../shared/components/AppIcon';
import { apiClient } from '../../../shared/api/client';
import { triggerGlobalAlert } from '../../../shared/store/globalAlertStore';
import { UserStackParamList } from '../../../navigation/types';

type EditProfileRouteProp = RouteProp<UserStackParamList, 'EditProfile'>;
type EditProfileNavigationProp = StackNavigationProp<UserStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { user, updateUser } = useAuthStore();
  const filterCategory = useEventsStore(state => state.filterCategory);
  const activeCategory = (filterCategory === 'all' ? 'other' : filterCategory) as EventCategory;
  const theme = categoryThemes[activeCategory];

  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<string>(user?.gender || '');
  const [dob, setDob] = useState<Date | undefined>(user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined);
  const [hobbies, setHobbies] = useState<string[]>(user?.hobbies || []);
  const [newHobby, setNewHobby] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const addHobby = () => {
    if (newHobby.trim() && !hobbies.includes(newHobby.trim())) {
      setHobbies([...hobbies, newHobby.trim()]);
      setNewHobby('');
    }
  };

  const removeHobby = (hobby: string) => {
    setHobbies(hobbies.filter(h => h !== hobby));
  };

  const saveProfile = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      triggerGlobalAlert({ type: 'warning', title: 'INVALID NAME', message: 'Name cannot be empty' });
      return;
    }

    setIsSaving(true);
    try {
      const fullUrl = `${apiClient.defaults.baseURL}/users/me`;
      console.log('Full URL being called:', fullUrl);
      console.log('Saving profile with data:', { name: name.trim(), gender, dateOfBirth: dob?.toISOString(), hobbies });
      const response = await apiClient.patch('/users/me', {
        name: name.trim(),
        gender: gender || undefined,
        dateOfBirth: dob?.toISOString(),
        hobbies: hobbies,
      });

      const updatedUser = response.data?.data;
      if (updatedUser) {
        updateUser(updatedUser);
      }

      triggerGlobalAlert({
        type: 'success',
        title: 'PROFILE UPDATED',
        message: 'Your profile has been updated successfully.',
      });
      
      navigation.goBack();
    } catch (error: any) {
      const errorData = error?.response?.data;
      console.log('Save profile error full:', JSON.stringify(errorData));
      const errorMsg = errorData?.error?.message || 'Unknown error';
      const errorCode = errorData?.error?.code || 'UNKNOWN';
      triggerGlobalAlert({
        type: 'error',
        title: errorCode,
        message: errorMsg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            navigation.goBack();
          }} 
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
        <TouchableOpacity onPress={saveProfile} disabled={isSaving}>
          <Text style={{ color: isSaving ? theme.textSecondary : theme.accent, fontWeight: '600' }}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border.color }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Gender</Text>
          <View style={styles.optionsRow}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { borderColor: theme.border.color },
                  gender === option.value && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setGender(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.textSecondary },
                    gender === option.value && { color: '#FFFFFF' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Date of Birth</Text>
          <TouchableOpacity
            style={[styles.input, { borderColor: theme.border.color }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: dob ? theme.textPrimary : theme.textSecondary }}>
              {dob ? dob.toLocaleDateString() : 'Select date of birth'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dob || new Date()}
              mode="date"
              display="default"
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                setShowDatePicker(false);
                if (selectedDate) setDob(selectedDate);
              }}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border.color }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Hobbies</Text>
          <View style={styles.hobbyInputRow}>
            <TextInput
              style={[styles.hobbyInput, { color: theme.textPrimary, borderColor: theme.border.color }]}
              value={newHobby}
              onChangeText={setNewHobby}
              placeholder="Add a hobby"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={addHobby}
            />
            <TouchableOpacity 
              style={[styles.addHobbyBtn, { backgroundColor: theme.accent }]} 
              onPress={addHobby}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.hobbiesContainer}>
            {hobbies.map((hobby) => (
              <TouchableOpacity
                key={hobby}
                style={[styles.hobbyTag, { backgroundColor: theme.accent + '20' }]}
                onPress={() => removeHobby(hobby)}
              >
                <Text style={[styles.hobbyText, { color: theme.accent }]}>{hobby}</Text>
                <Icon name="x" size={14} color={theme.accent} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
  },
  hobbyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hobbyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addHobbyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hobbiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  hobbyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hobbyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});