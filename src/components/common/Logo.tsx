import { View, Text, StyleSheet } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography, radius, spacing } from '../../theme/typography';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 20, box: 32, text: 18 },
  md: { icon: 28, box: 44, text: 24 },
  lg: { icon: 36, box: 56, text: 32 },
};

export function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { width: s.box, height: s.box, borderRadius: radius.md }]}>
        <Leaf size={s.icon} color={colors.white} />
      </View>
      <Text style={[styles.text, { fontSize: s.text }]}>
        Green<Text style={styles.accent}>Slot</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    backgroundColor: colors.green[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: 'Inter_700Bold', color: colors.gray[900] },
  accent: { color: colors.green[600] },
});
