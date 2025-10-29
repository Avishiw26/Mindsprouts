import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from "react-native";
import RNFS from "react-native-fs";
import RNFetchBlob from "rn-fetch-blob";
import LinearGradient from "react-native-linear-gradient";
import { games } from "./games";

export default function App() {
  const [downloadingGame, setDownloadingGame] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Ask for permissions (only for older Androids)
  const requestPermission = async () => {
    if (Platform.OS !== "android") return true;
    if (Platform.Version < 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // ✅ Download, install, and show message once installed
  const installGame = async (game) => {
    try {
      const ok = await requestPermission();
      if (!ok) {
        Alert.alert("Permission Denied", "Storage permission required.");
        return;
      }

      setDownloadingGame(game.id);
      Alert.alert("📦 Downloading...", `Please wait while ${game.title} downloads.`);

      const dest = `${RNFS.DownloadDirectoryPath}/${game.title
        .replace(/[^a-zA-Z0-9]/g, "_")
        .trim()}.apk`;

      const result = await RNFS.downloadFile({
        fromUrl: game.apkUrl,
        toFile: dest,
      }).promise;

      if (result.statusCode === 200) {
        const authority = "com.mindsproutsapp.provider";
        const IntentLauncher = require("react-native-intent-launcher");

        // ✅ Launch system installer
        await RNFetchBlob.android.actionViewIntent(
          dest,
          "application/vnd.android.package-archive",
          authority
        );

        // ✅ Reset UI immediately after installer opens
        setDownloadingGame(null);

        // ✅ Check every 2 seconds if installed
        const pkg = game.packageName;
        const checkInterval = setInterval(async () => {
          try {
            const isInstalled = await IntentLauncher.isAppInstalled(pkg);
            if (isInstalled) {
              clearInterval(checkInterval);
              Alert.alert("✅ Installed", `${game.title} has been installed successfully!`);
              // Optional auto-launch
              await IntentLauncher.startAppByPackageName(pkg);
            }
          } catch (e) {
            console.log("⏳ Checking install status...");
          }
        }, 2000);

        // Auto-stop after 20 seconds
        setTimeout(() => clearInterval(checkInterval), 20000);
      } else {
        Alert.alert("Error", "Download failed. Please check the link.");
        setDownloadingGame(null);
      }
    } catch (error) {
      console.error("Install error:", error);
      setDownloadingGame(null);
      Alert.alert("Error", "Could not install APK.");
    }
  };

  // ✅ Game grid renderer
  const renderGame = ({ item }) => (
    <View style={styles.gridItem}>
      <View style={styles.iconContainer}>
        <Image source={item.image} style={styles.image} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => installGame(item)}
        disabled={downloadingGame === item.id}
      >
        <LinearGradient
          colors={["#FF4081", "#E91E63"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {downloadingGame === item.id ? "⏳ Installing..." : "⬇ Install"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // ✅ Splash screen
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image source={require("./assets/logo.jpg")} style={styles.splashLogo} />
        <Text style={styles.splashText}>MindSprouts</Text>
        <ActivityIndicator size="large" color="#7B1FA2" style={{ marginTop: 15 }} />
      </View>
    );
  }

  // ✅ Main grid screen
  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎮 MindSprouts</Text>
      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B9FBC0",
    paddingTop: 50,
  },
  header: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "bold",
    color: "#5A005F",
    marginBottom: 15,
    letterSpacing: 1,
  },
  row: {
    justifyContent: "space-around",
  },
  gridItem: {
    alignItems: "center",
    width: "45%",
    marginVertical: 20,
  },
  iconContainer: {
    backgroundColor: "#FFF",
    borderRadius: 60,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  image: {
    width: 85,
    height: 85,
    borderRadius: 50,
  },
  title: {
    color: "#3B0A45",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
    marginTop: 5,
  },
  desc: {
    color: "#4C2A56",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 5,
    lineHeight: 16,
  },
  button: {
    borderRadius: 25,
    paddingVertical: 7,
    paddingHorizontal: 25,
    marginTop: 8,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
  // Splash screen styles
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B9FBC0",
  },
  splashLogo: {
    width: 130,
    height: 130,
    resizeMode: "contain",
  },
  splashText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5A005F",
    marginTop: 15,
  },
});
