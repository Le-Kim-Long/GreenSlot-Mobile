import React, { memo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

interface CameraStreamPlayerProps {
  streamUrl: string;
  resizeMode?: 'contain' | 'cover';
  pointerEvents?: 'none' | 'auto';
  style?: StyleProp<ViewStyle>;
}

export const CameraStreamPlayer: React.FC<CameraStreamPlayerProps> = memo(({
  streamUrl,
  resizeMode = 'contain',
  pointerEvents = 'auto',
  style,
}) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        background-color: #0f1923;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: ${resizeMode};
        display: block;
      }
    </style>
  </head>
  <body>
    <img src="${streamUrl}" alt="Live Stream" />
  </body>
</html>
  `;

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        androidLayerType="hardware"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f1923',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f1923',
  },
});

export default CameraStreamPlayer;
