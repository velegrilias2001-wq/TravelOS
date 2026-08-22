import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function WorldScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          TRAVEL OS
        </Text>

        <Text style={styles.title}>
          World
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F5EF',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8A7350',
    marginBottom: 10,
  },

  title: {
    fontSize: 38,
    fontWeight: '700',
    color: '#173C38',
  },
});