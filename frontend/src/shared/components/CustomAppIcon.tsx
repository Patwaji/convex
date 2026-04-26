import React from 'react';
import { StyleSheet, Image, View } from 'react-native';

const CUSTOM_ICON_SIZE = 72;

export default function CustomAppIcon() {
  return (
    <View style={styles.container}>
      <Image
        source={require('./AppIcon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CUSTOM_ICON_SIZE,
    height: CUSTOM_ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: CUSTOM_ICON_SIZE,
    height: CUSTOM_ICON_SIZE,
  },
});