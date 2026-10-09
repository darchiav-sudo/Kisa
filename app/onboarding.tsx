import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, OptionPill, PrimaryButton, StepDots, tap } from '@/src/components/ui';
import {
  ASSETS,
  ASSETS_FEATURED,
  LANGUAGES,
  LANGUAGES_FEATURED,
  Option,
  OptionGroup,
  PRODUCT,
  SKILLS,
  START,
  WORK_STYLE,
  budgetOptions,
} from '@/src/data/intakeOptions';
import { useDeviceLocation } from '@/src/lib/location';
import { findIdeaNow } from '@/src/lib/nav';
import type { Area, Coords, Intake } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, iconPalette } from '@/src/theme/colors';

type Answers = {
  start: string[];
  product: string[];
  budget: string[];
  assets: string[];
  skills: string[];
  loves: string[];
  languages: string[];
  workStyle: string[];
};

type Step =
  | { id: keyof Answers; kind: 'single'; title: string; subtitle: string; options: (inGeorgia: boolean) => Option[] }
  | {
      id: keyof Answers;
      kind: 'multi';
      title: string;
      subtitle: string;
      groups: OptionGroup[];
      /** Options shown before "Show more": the first N, or exactly these labels. */
      collapseTo?: number;
      featured?: string[];
    }
  | { id: 'loves'; kind: 'loves'; title: string; subtitle: string }
  | { id: 'location'; kind: 'location'; title: string; subtitle: string };

const ALL_OPTIONS = [...SKILLS, ...ASSETS].flatMap((g) => g.options);

/** "What would you love to do?" offers back what they already said they're good at and have. */
function loveGroups(answers: Answers): OptionGroup[] {
  const pick = (labels: string[]) =>
    labels.map((label) => ALL_OPTIONS.find((o) => (o.value ?? o.label) === label) ?? { label, icon: 'heart' as const });
  return [
    { title: 'What you’re good at', options: pick(answers.skills) },
    { title: 'What you have', options: pick(answers.assets) },
  ].filter((g) => g.options.length);
}

const STEPS: Step[] = [
  {
    id: 'start',
    kind: 'single',
    title: 'What should Kisa do for you?',
    subtitle: 'One tap and we’re off.',
    options: () => START,
  },
  {
    id: 'product',
    kind: 'multi',
    title: 'What do you sell?',
    subtitle: 'Pick everything that fits.',
    groups: PRODUCT,
    collapseTo: 6,
  },
  {
    id: 'location',
    kind: 'location',
    title: 'Where are you?',
    subtitle: 'Kisa looks for customers and real prices near you.',
  },
  {
    id: 'budget',
    kind: 'single',
    title: 'How much can you risk?',
    subtitle: 'Kisa never spends before the first real order.',
    options: budgetOptions,
  },
  {
    id: 'assets',
    kind: 'multi',
    title: 'What do you have?',
    subtitle: 'Tap everything you could use.',
    groups: ASSETS,
    featured: ASSETS_FEATURED,
  },
  {
    id: 'skills',
    kind: 'multi',
    title: 'What are you good at?',
    subtitle: 'Or what you enjoy. Online skills count too.',
    groups: SKILLS,
    collapseTo: 4,
  },
  {
    id: 'loves',
    kind: 'loves',
    title: 'What would you love your business to be about?',
    subtitle: 'Kisa builds around what makes you happy — like doing more vibe coding.',
  },
  {
    id: 'languages',
    kind: 'multi',
    title: 'Which languages do you speak?',
    subtitle: 'More languages, more customers.',
    groups: LANGUAGES,
    featured: LANGUAGES_FEATURED,
  },
  {
    id: 'workStyle',
    kind: 'single',
    title: 'Where do you want to work?',
    subtitle: 'Last one!',
    options: () => WORK_STYLE,
  },
];

function answersFrom(intake: Intake | null): Answers {
  return {
    start: intake ? [intake.start] : [],
    product: intake?.product ? intake.product.split(', ').filter(Boolean) : [],
    budget: intake?.budget ? [intake.budget] : [],
    assets: intake?.assets ?? [],
    skills: intake?.skills ?? [],
    loves: intake?.loves ?? [],
    languages: intake?.languages ?? [],
    workStyle: intake?.workStyle ? [intake.workStyle] : [],
  };
}

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const previous = useAppStore((s) => s.intake);
  const setIntake = useAppStore((s) => s.setIntake);
  const [answers, setAnswers] = useState<Answers>(() => answersFrom(previous));
  const [location, setLocation] = useState<{ label: string; coords?: Coords; area?: Area }>(() => ({
    label: previous?.location ?? '',
    coords: previous?.coords,
    area: previous?.area,
  }));
  const [index, setIndex] = useState(0);
  const anim = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);

  const steps = useMemo(
    () => STEPS.filter((s) => s.id !== 'product' || answers.start[0] === 'existing'),
    [answers.start],
  );
  const step = steps[index];
  const inGeorgia = /georgia|საქართველო|tbilisi|batumi|kutaisi|rustavi/i.test(location.label);

  // JS driver on purpose: with the native driver, Android (new arch) keeps hit-testing the
  // pre-animation position, so the Continue button sometimes ignores taps.
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [index, anim]);

  const advancing = useRef(false);
  useEffect(() => {
    advancing.current = false;
  }, [index]);

  const finish = (final: Answers) => {
    const intake: Intake = {
      start: final.start[0] === 'existing' ? 'existing' : 'new',
      product: final.start[0] === 'existing' && final.product.length ? final.product.join(', ') : undefined,
      location: location.label.trim(),
      coords: location.coords,
      area: location.area,
      budget: final.budget[0] ?? '',
      assets: final.assets,
      skills: final.skills,
      loves: final.loves.filter((v) => final.skills.includes(v) || final.assets.includes(v) || !ALL_OPTIONS.some((o) => (o.value ?? o.label) === v)),
      languages: final.languages,
      workStyle: final.workStyle[0] ?? 'Anything works',
    };
    tap('success');
    setIntake(intake);
    findIdeaNow(mode === 'hands-off' ? 'hands-off' : 'hands-on', true);
  };

  const next = (final = answers) => {
    if (advancing.current) return;
    advancing.current = true;
    direction.current = 1;
    if (index >= steps.length - 1) {
      finish(final);
      setTimeout(() => (advancing.current = false), 800);
    } else setIndex((i) => i + 1);
  };

  const back = () => {
    direction.current = -1;
    if (index > 0) setIndex((i) => i - 1);
    else if (router.canGoBack()) router.back();
  };

  const canClose = index > 0 || router.canGoBack();

  const head = (
    <View style={styles.titles}>
      <StepDots step={index} total={steps.length} />
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.header}>
          <Pressable
            onPress={back}
            hitSlop={12}
            disabled={!canClose}
            style={[styles.side, { opacity: canClose ? 1 : 0 }]}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
        </View>

        <Animated.View
          style={{
            flex: 1,
            opacity: anim,
            transform: [
              {
                translateX: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28 * direction.current, 0],
                }),
              },
            ],
          }}
        >
          {step.kind === 'location' ? (
            <LocationStep head={head} value={location} onChange={setLocation} onContinue={() => next()} />
          ) : step.kind === 'single' ? (
            <SingleStep
              key={step.id}
              head={head}
              options={step.options(inGeorgia)}
              selected={answers[step.id]}
              onPick={(value) => {
                if (advancing.current) return;
                const updated = { ...answers, [step.id]: [value] };
                setAnswers(updated);
                setTimeout(() => next(updated), 200);
              }}
            />
          ) : step.kind === 'loves' ? (
            <MultiStep
              key={step.id}
              head={head}
              groups={loveGroups(answers)}
              selected={answers.loves}
              onChange={(values) => setAnswers({ ...answers, loves: values })}
              onContinue={() => next()}
              allowCustom
              optional
            />
          ) : (
            <MultiStep
              key={step.id}
              head={head}
              groups={step.groups}
              collapseTo={step.collapseTo}
              featured={step.featured}
              selected={answers[step.id]}
              onChange={(values) => setAnswers({ ...answers, [step.id]: values })}
              onContinue={() => next()}
              allowCustom={step.id !== 'languages'}
            />
          )}
        </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SingleStep({
  head,
  options,
  selected,
  onPick,
}: {
  head: ReactNode;
  options: Option[];
  selected: string[];
  onPick: (value: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.centerBody}>
      {head}
      <View style={styles.singleList}>
      {options.map((o, i) => {
        const value = o.value ?? o.label;
        return (
          <OptionPill
            key={value}
            size="lg"
            label={o.label}
            icon={o.icon}
            emoji={o.emoji}
            iconColor={iconPalette[i % iconPalette.length]}
            selected={selected.includes(value)}
            onPress={() => onPick(value)}
          />
        );
      })}
      </View>
    </ScrollView>
  );
}

function MultiStep({
  head,
  groups,
  collapseTo,
  featured,
  selected,
  onChange,
  onContinue,
  allowCustom,
  optional,
}: {
  head: ReactNode;
  groups: OptionGroup[];
  collapseTo?: number;
  featured?: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  onContinue: () => void;
  allowCustom: boolean;
  /** Continue is allowed with nothing picked. */
  optional?: boolean;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const allOptions = groups.flatMap((g) => g.options);
  const top = featured
    ? allOptions.filter((o) => featured.includes(o.value ?? o.label))
    : collapseTo
      ? allOptions.slice(0, collapseTo)
      : allOptions;
  const canCollapse = allOptions.length > top.length;
  const [expanded, setExpanded] = useState(
    () => canCollapse && selected.some((v) => !top.some((o) => (o.value ?? o.label) === v)),
  );
  const known = new Set(allOptions.map((o) => o.value ?? o.label));
  const customValues = selected.filter((v) => !known.has(v));
  let colorIndex = 0;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  // Collapsed: the first few options as one flat group, plus anything already picked.
  const visibleGroups: OptionGroup[] =
    canCollapse && !expanded
      ? [
          {
            options: allOptions.filter((o) => top.includes(o) || selected.includes(o.value ?? o.label)),
          },
        ]
      : groups;

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const addCustom = () => {
    const value = custom.trim();
    setCustom('');
    setCustomOpen(false);
    if (value && !selected.includes(value)) onChange([...selected, value]);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.centerBody} keyboardShouldPersistTaps="handled">
        {head}
        {visibleGroups.map((g) => (
          <View key={g.title ?? 'all'} style={{ marginBottom: 14 }}>
            {g.title ? <Text style={styles.groupTitle}>{g.title}</Text> : null}
            <View style={styles.chips}>
              {g.options.map((o) => {
                const value = o.value ?? o.label;
                return (
                  <OptionPill
                    key={value}
                    size="sm"
                    label={o.label}
                    icon={o.icon}
                    emoji={o.emoji}
                    iconColor={iconPalette[colorIndex++ % iconPalette.length]}
                    selected={selected.includes(value)}
                    onPress={() => toggle(value)}
                  />
                );
              })}
            </View>
          </View>
        ))}

        {canCollapse ? (
          <Pressable onPress={toggleExpanded} style={styles.moreBtn} accessibilityRole="button">
            <Text style={styles.moreText}>{expanded ? 'Show less' : `Show ${allOptions.length - top.length} more`}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.white} />
          </Pressable>
        ) : null}

        {allowCustom && (!canCollapse || expanded) ? (
          <View style={styles.chips}>
            {customValues.map((v) => (
              <OptionPill key={v} size="sm" label={v} icon="create" selected onPress={() => toggle(v)} />
            ))}
            {customOpen ? (
              <View style={styles.customBox}>
                <TextInput
                  autoFocus
                  value={custom}
                  onChangeText={setCustom}
                  onSubmitEditing={addCustom}
                  onBlur={addCustom}
                  placeholder="Type and press done"
                  placeholderTextColor={colors.faint}
                  style={styles.customInput}
                  returnKeyType="done"
                />
              </View>
            ) : (
              <OptionPill
                size="sm"
                label="Other"
                icon="add"
                iconColor={colors.white}
                selected={false}
                onPress={() => setCustomOpen(true)}
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={selected.length ? `Continue · ${selected.length}` : optional ? 'Any of them is fine' : 'Pick at least one'}
          onPress={onContinue}
          disabled={!optional && selected.length === 0}
          chevron={selected.length > 0 || !!optional}
        />
      </View>
    </View>
  );
}

function LocationStep({
  head,
  value,
  onChange,
  onContinue,
}: {
  head: ReactNode;
  value: { label: string; coords?: Coords; area?: Area };
  onChange: (v: { label: string; coords?: Coords; area?: Area }) => void;
  onContinue: () => void;
}) {
  const { status, error, detect } = useDeviceLocation();
  const [typing, setTyping] = useState(false);
  const requested = useRef(false);

  const run = async () => {
    setTyping(false);
    const found = await detect();
    if (found) onChange(found);
  };

  useEffect(() => {
    if (requested.current || value.label) return;
    requested.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manual = typing || status === 'denied' || status === 'error';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.centerBody, styles.locationBody]} keyboardShouldPersistTaps="handled">
        {head}
        <View style={styles.pin}>
          {status === 'detecting' ? (
            <ActivityIndicator color={colors.blueBright} />
          ) : (
            <Ionicons name="location" size={34} color={colors.blueBright} />
          )}
        </View>

        {status === 'detecting' ? (
          <Text style={styles.locationHint}>Finding where you are…</Text>
        ) : manual ? (
          <>
            <Text style={styles.locationHint}>
              {status === 'denied'
                ? 'Location is off. Allow it for the best local ideas, or type your city.'
                : status === 'error'
                  ? `Couldn’t get your location${error ? ` (${error})` : ''}. Type your city.`
                  : 'Type your neighborhood and city.'}
            </Text>
            <TextInput
              value={value.label}
              onChangeText={(label) => onChange({ label })}
              placeholder="e.g. Saburtalo, Tbilisi"
              placeholderTextColor={colors.faint}
              style={[styles.customInput, styles.locationInput]}
            />
          </>
        ) : value.label ? (
          <Text style={styles.locationValue}>{value.label}</Text>
        ) : null}

        <View style={styles.locationActions}>
          {status !== 'detecting' ? (
            <OptionPill size="sm" label="Use my location" icon="navigate" selected={false} onPress={run} />
          ) : null}
          {!manual && value.label && status !== 'detecting' ? (
            <OptionPill
              size="sm"
              label="Type it"
              icon="create"
              iconColor={colors.pink}
              selected={false}
              onPress={() => setTyping(true)}
            />
          ) : null}
          {status === 'denied' ? (
            <OptionPill
              size="sm"
              label="Open settings"
              icon="settings"
              iconColor={colors.amber}
              selected={false}
              onPress={() => Linking.openSettings()}
            />
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={value.label.trim() ? 'Yes, that’s me' : 'Waiting for location…'}
          onPress={onContinue}
          disabled={!value.label.trim()}
          chevron={!!value.label.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  side: { width: 44, height: 32, justifyContent: 'center' },
  titles: { paddingHorizontal: 8, paddingBottom: 22, alignItems: 'center', gap: 0 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 29,
    marginTop: 18,
  },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 8, textAlign: 'center' },
  centerBody: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  singleList: { gap: 12, paddingHorizontal: 4 },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  moreText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  groupTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  customBox: { minWidth: 200 },
  customInput: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  locationBody: { alignItems: 'center', paddingHorizontal: 24 },
  pin: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1430',
    borderWidth: 1,
    borderColor: colors.blueBorder,
    shadowColor: colors.blue,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    marginBottom: 20,
  },
  locationHint: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  locationValue: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  locationInput: { alignSelf: 'stretch', marginTop: 16, fontSize: 16, paddingVertical: 13, borderRadius: 24 },
  locationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 },
});
