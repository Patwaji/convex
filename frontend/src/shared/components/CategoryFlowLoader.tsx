import React, { useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import CustomAppIcon from './CustomAppIcon';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 100vw;
    height: 100vh;
    background: #ffffff;
    overflow: hidden;
  }
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.22;
    animation: drift linear infinite;
  }
  @keyframes drift {
    0%   { transform: translate(0px,   0px)  scale(1);    }
    25%  { transform: translate(30px, -25px) scale(1.08); }
    50%  { transform: translate(-25px, 35px) scale(0.95); }
    75%  { transform: translate(25px,  25px) scale(1.05); }
    100% { transform: translate(0px,   0px)  scale(1);    }
  }
  .b1 { width:340px; height:340px; background:#6366f1; top:-80px;  left:-80px;  animation-duration:9s;  }
  .b2 { width:280px; height:280px; background:#ec4899; top:80px;   right:-60px; animation-duration:11s; animation-delay:-3s; }
  .b3 { width:260px; height:260px; background:#f59e0b; top:38vh;   left:-40px;  animation-duration:13s; animation-delay:-6s; }
  .b4 { width:220px; height:220px; background:#10b981; bottom:-40px; right:-20px; animation-duration:10s; animation-delay:-2s; }
  .b5 { width:200px; height:200px; background:#3b82f6; top:28vh;   left:30px;   animation-duration:14s; animation-delay:-5s; }
  .b6 { width:180px; height:180px; background:#f97316; bottom:15vh; right:40px;  animation-duration:12s; animation-delay:-8s; }
</style>
</head>
<body>
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
  <div class="blob b4"></div>
  <div class="blob b5"></div>
  <div class="blob b6"></div>
</body>
</html>
`;

export default function CategoryFlowLoader() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(logoScale, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [logoOpacity, logoScale]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        style={StyleSheet.absoluteFill}
        source={{ html: HTML }}
        scrollEnabled={false}
        pointerEvents="none"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        backgroundColor="transparent"
      />

      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <CustomAppIcon />
        <Animated.Text style={styles.appName}>Convex</Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 2,
    marginTop: 4,
  },
});