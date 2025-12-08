import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { formatNumberWithCommas, parseCommaNumber } from '../utils/number-format';

type RankOption = 'UM' | 'SUM' | 'AD';

interface SegmentationTier {
  name: string;
  anp: number;
  recruits: number;
  persistency: number;
}

function getTierRequirements(rank: RankOption): SegmentationTier[] {
  if (rank === 'UM') {
    return [
      { name: 'Standard', anp: 400000, recruits: 1, persistency: 75 },
      { name: 'Executive', anp: 800000, recruits: 2, persistency: 75 },
      { name: 'Premier', anp: 1200000, recruits: 3, persistency: 82.5 },
    ];
  }
  if (rank === 'SUM') {
    return [
      { name: 'Standard', anp: 2500000, recruits: 4, persistency: 75 },
      { name: 'Executive', anp: 3000000, recruits: 5, persistency: 75 },
      { name: 'Premier', anp: 3500000, recruits: 6, persistency: 82.5 },
    ];
  }
  // AD
  return [
    { name: 'Standard', anp: 6000000, recruits: 7, persistency: 75 },
    { name: 'Executive', anp: 7500000, recruits: 8, persistency: 75 },
    { name: 'Premier', anp: 9000000, recruits: 9, persistency: 82.5 },
  ];
}

export function PathToPremierScreen() {
  const [rank, setRank] = useState<RankOption>('UM');
  const [currentANP, setCurrentANP] = useState<number>(0);
  const [currentNGE, setCurrentNGE] = useState<number>(0); // 1 NGE = 2 recruits
  const [currentRecruits, setCurrentRecruits] = useState<number>(0);
  const [currentPersistency, setCurrentPersistency] = useState<number>(75);

  const tiers = useMemo(() => getTierRequirements(rank), [rank]);
  const anpLabel = rank === 'UM' ? 'Direct Team ANP (Sep-Dec 2025)' : 'Team ANP (Sep-Dec 2025)';

  useEffect(() => {
    setCurrentRecruits(currentNGE * 2);
  }, [currentNGE]);

  const { currentTier, nextTier, gaps } = useMemo(() => {
    let tierIndex = 0;
    if (
      currentANP >= tiers[2].anp &&
      currentRecruits >= tiers[2].recruits &&
      currentPersistency >= tiers[2].persistency
    ) {
      tierIndex = 2;
    } else if (
      currentANP >= tiers[1].anp &&
      currentRecruits >= tiers[1].recruits &&
      currentPersistency >= tiers[1].persistency
    ) {
      tierIndex = 1;
    } else {
      tierIndex = 0;
    }

    const ct = tiers[tierIndex];
    const nt = tierIndex < tiers.length - 1 ? tiers[tierIndex + 1] : null;

    const gapsCalc = nt
      ? {
          anp: Math.max(0, nt.anp - currentANP),
          recruits: Math.max(0, nt.recruits - currentRecruits),
          persistency: Math.max(0, nt.persistency - currentPersistency),
        }
      : { anp: 0, recruits: 0, persistency: 0 };

    return { currentTier: ct, nextTier: nt, gaps: gapsCalc };
  }, [currentANP, currentRecruits, currentPersistency, tiers]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Path to Premier</Text>
        <Text style={styles.muted}>
          Sep-Dec 2025 challenge. 1 NGE = 2 Active New Recruits. Requirements vary by rank.
        </Text>
      </View>

      {/* Rank Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Select Rank</Text>
        <View style={styles.row}>
          {(['UM', 'SUM', 'AD'] as RankOption[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, rank === r && styles.chipActive]}
              onPress={() => setRank(r)}
            >
              <Text style={[styles.chipText, rank === r && styles.chipTextActive]}>
                {r === 'UM' ? 'UM' : r === 'SUM' ? 'SUM' : 'AD'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Inputs */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{anpLabel}</Text>
          <TextInput
            keyboardType="numeric"
            value={formatNumberWithCommas(currentANP)}
            onChangeText={(text) => setCurrentANP(parseCommaNumber(text))}
            style={styles.input}
            placeholder="0"
          />
          <Text style={styles.help}>Current: ₱{(currentANP / 1_000_000).toFixed(2)}M</Text>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Active NGE</Text>
          <TextInput
            keyboardType="numeric"
            value={currentNGE.toString()}
            onChangeText={(text) => setCurrentNGE(parseInt(text || '0', 10) || 0)}
            style={styles.input}
            placeholder="0"
          />
          <Text style={styles.help}>= {currentRecruits} Active New Recruits (1 NGE = 2 recruits)</Text>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Team Persistency (%)</Text>
          <TextInput
            keyboardType="numeric"
            value={currentPersistency.toString()}
            onChangeText={(text) => setCurrentPersistency(parseFloat(text || '0') || 0)}
            style={styles.input}
            placeholder="75"
          />
        </View>
      </View>

      {/* Tiers */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tiers</Text>
        {tiers.map((tier) => {
          const isCurrent = tier.name === currentTier.name;
          const isAchieved =
            currentANP >= tier.anp &&
            currentRecruits >= tier.recruits &&
            currentPersistency >= tier.persistency;
          return (
            <View key={tier.name} style={[styles.tier, isCurrent && styles.tierCurrent]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, isCurrent && styles.tierNameActive]}>{tier.name}</Text>
                {isCurrent && <Text style={styles.badge}>CURRENT</Text>}
                {isAchieved && !isCurrent && <Text style={[styles.badge, styles.badgeGreen]}>✓</Text>}
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.muted}>{rank === 'UM' ? 'Direct Team ANP' : 'Team ANP'}</Text>
                <Text style={styles.value}>₱{(tier.anp / 1_000_000).toFixed(1)}M</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.muted}>Active New Recruits</Text>
                <Text style={styles.value}>{tier.recruits}</Text>
              </View>
              <View style={styles.tierRow}>
                <Text style={styles.muted}>Team Persistency</Text>
                <Text style={styles.value}>{tier.persistency}%+</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Gaps */}
      {nextTier && (
        <View style={styles.cardHighlight}>
          <Text style={styles.sectionTitle}>Gap to {nextTier.name}</Text>
          <View style={styles.gapRow}>
            <View style={styles.gapItem}>
              <Text style={styles.label}>ANP Gap</Text>
              <Text style={styles.gapValue}>₱{(gaps.anp / 1_000_000).toFixed(2)}M</Text>
            </View>
            <View style={styles.gapItem}>
              <Text style={styles.label}>Recruits Gap</Text>
              <Text style={styles.gapValue}>{gaps.recruits} ({Math.ceil(gaps.recruits / 2)} NGE)</Text>
            </View>
            <View style={styles.gapItem}>
              <Text style={styles.label}>Persistency Gap</Text>
              <Text style={styles.gapValue}>{gaps.persistency.toFixed(1)}%</Text>
            </View>
          </View>
          {gaps.anp === 0 && gaps.recruits === 0 && gaps.persistency === 0 && (
            <View style={styles.successBox}>
              <Text style={styles.success}>🎉 Qualified for {nextTier.name}!</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHighlight: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  muted: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#D31145',
    backgroundColor: '#FFF1F2',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#D31145',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  help: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  tier: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  tierCurrent: {
    borderColor: '#D31145',
    backgroundColor: '#FFF1F2',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierNameActive: {
    color: '#D31145',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D31145',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeGreen: {
    color: '#15803D',
    backgroundColor: '#DCFCE7',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  gapRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  gapItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  gapValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    marginTop: 4,
  },
  successBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
  },
  success: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
});

