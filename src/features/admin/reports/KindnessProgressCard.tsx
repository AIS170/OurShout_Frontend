import {
  Button,
  Caption1,
  Field,
  Input,
  makeStyles,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DismissRegular,
  EditRegular,
  HeartRegular,
  SaveRegular,
  SparkleRegular,
} from '@fluentui/react-icons';
import React, { useEffect, useState } from 'react';
import { saveKindnessGoal } from '../adminData';

const DEFAULT_GOAL = 100;
const STORAGE_KEY = 'sandoz_kindness_goal';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXL,
    border: `1.5px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGoalReached: {
    border: '1.5px solid #FCD34D',
    boxShadow: '0 4px 20px rgba(217, 119, 6, 0.12)',
    background: 'linear-gradient(180deg, #FFFCF2 0%, #FFFFFF 100%)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  iconBox: {
    width: '42px',
    height: '42px',
    borderRadius: tokens.borderRadiusCircular,
    background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
    color: '#E11D48',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(225, 29, 72, 0.18)',
  },
  iconBoxReached: {
    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    color: '#B45309',
    boxShadow: '0 2px 8px rgba(180, 83, 9, 0.25)',
  },
  cardTitle: {
    ...typographyStyles.subtitle1,
    margin: 0,
    color: 'var(--sandoz-navy)',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  statGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: tokens.spacingHorizontalS,
  },
  bigCount: {
    ...typographyStyles.title1,
    margin: 0,
    fontWeight: tokens.fontWeightBold,
    color: 'var(--sandoz-navy)',
    fontVariantNumeric: 'tabular-nums',
  },
  progressBarTrack: {
    width: '100%',
    height: '20px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: '#F1F5F9',
    border: '1px solid #E2E8F0',
    position: 'relative',
    overflow: 'visible',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: tokens.borderRadiusCircular,
    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
  },
  fillNormal: {
    background: 'linear-gradient(90deg, #F43F5E 0%, #EC4899 50%, #8B5CF6 100%)',
    boxShadow: '0 2px 8px rgba(236, 72, 153, 0.35)',
  },
  fillExtended: {
    background: 'linear-gradient(90deg, #10B981 0%, #059669 45%, #F59E0B 75%, #D97706 100%)',
    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
  },
  scaleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  markerLine: {
    position: 'absolute',
    top: '-6px',
    bottom: '-6px',
    width: '2px',
    backgroundColor: '#D97706',
    zIndex: 2,
  },
  markerBadge: {
    position: 'absolute',
    bottom: '26px',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    color: '#92400E',
    fontSize: '0.68rem',
    fontWeight: tokens.fontWeightBold,
    padding: '2px 6px',
    borderRadius: tokens.borderRadiusCircular,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  bannerCelebration: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
    fontSize: '0.82rem',
    fontWeight: tokens.fontWeightSemibold,
  },
  editBox: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export interface KindnessProgressCardProps {
  currentCount: number;
  serverGoal?: number;
  totalPosts: number;
  isAdmin?: boolean;
}

export const KindnessProgressCard: React.FC<KindnessProgressCardProps> = ({
  currentCount,
  serverGoal,
  totalPosts,
  isAdmin = false,
}) => {
  const styles = useStyles();

  // 1. Initial goal: serverGoal -> localStorage -> DEFAULT_GOAL (100)
  const [baseGoal, setBaseGoal] = useState<number>(() => {
    if (serverGoal && serverGoal > 0) return serverGoal;
    const local = localStorage.getItem(STORAGE_KEY);
    if (local && !isNaN(Number(local)) && Number(local) > 0) return Number(local);
    return DEFAULT_GOAL;
  });

  // Sync if serverGoal updates
  useEffect(() => {
    if (serverGoal && serverGoal > 0 && serverGoal !== baseGoal) {
      setBaseGoal(serverGoal);
      localStorage.setItem(STORAGE_KEY, String(serverGoal));
    }
  }, [serverGoal]);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempGoal, setTempGoal] = useState<string>(String(baseGoal));
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  // 2. Goal extension logic:
  // If currentCount >= baseGoal, extend the progress bar dynamically beyond baseGoal!
  const isGoalReached = currentCount >= baseGoal;
  let effectiveGoal = baseGoal;
  if (isGoalReached) {
    // Extend in smooth milestone increments (minimum 10 or 50% of baseGoal)
    const step = Math.max(10, Math.round(baseGoal * 0.5));
    effectiveGoal = baseGoal + Math.ceil((currentCount - baseGoal + 1) / step) * step;
  }

  const progressPercent = Math.min(100, Math.max(0, Math.round((currentCount / effectiveGoal) * 100)));
  const baseGoalPositionPercent = (baseGoal / effectiveGoal) * 100;
  const kindnessSharePercent = totalPosts > 0 ? Math.round((currentCount / totalPosts) * 100) : 0;

  const handleSaveGoal = async () => {
    const parsed = parseInt(tempGoal, 10);
    if (isNaN(parsed) || parsed <= 0) return;

    setBaseGoal(parsed);
    localStorage.setItem(STORAGE_KEY, String(parsed));
    setIsEditing(false);
    setSaveSuccess(`Goal updated to ${parsed} kindness posts.`);
    setTimeout(() => setSaveSuccess(''), 4000);

    try {
      await saveKindnessGoal(parsed);
    } catch (e) {
      console.warn('Could not persist kindness goal to server, saved locally:', e);
    }
  };

  const handleResetGoal = async () => {
    setTempGoal(String(DEFAULT_GOAL));
    setBaseGoal(DEFAULT_GOAL);
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_GOAL));
    setIsEditing(false);
    setSaveSuccess(`Goal reset to default (${DEFAULT_GOAL} posts).`);
    setTimeout(() => setSaveSuccess(''), 4000);

    try {
      await saveKindnessGoal(DEFAULT_GOAL);
    } catch (e) {
      console.warn('Could not persist kindness goal to server, saved locally:', e);
    }
  };

  return (
    <div className={`${styles.card} ${isGoalReached ? styles.cardGoalReached : ''}`}>
      {/* Top Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <div className={`${styles.iconBox} ${isGoalReached ? styles.iconBoxReached : ''}`}>
            {isGoalReached ? <SparkleRegular /> : <HeartRegular />}
          </div>
          <div>
            <h3 className={styles.cardTitle}>
              Acts of Kindness Progress
              {isGoalReached && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Milestone Reached!
                </span>
              )}
            </h3>
            <Caption1 style={{ color: 'var(--sandoz-text-muted)' }}>
              Tracking company-wide kindness recognition towards our target milestone
            </Caption1>
          </div>
        </div>

        {/* Admin Set Limit Controls */}
        {isAdmin && !isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button
              size="small"
              appearance="subtle"
              icon={<EditRegular />}
              onClick={() => {
                setTempGoal(String(baseGoal));
                setIsEditing(true);
              }}
              title="Set custom kindness goal"
            >
              Set Limit ({baseGoal})
            </Button>
          </div>
        )}
      </div>

      {/* Admin Inline Limit Editor */}
      {isEditing && (
        <div className={styles.editBox}>
          <Field label="Set Kindness Target Limit" style={{ minWidth: '180px' }}>
            <Input
              type="number"
              min={1}
              max={10000}
              value={tempGoal}
              onChange={(_, d) => setTempGoal(d.value)}
              autoFocus
            />
          </Field>
          <Button appearance="primary" size="small" icon={<SaveRegular />} onClick={handleSaveGoal}>
            Save Target
          </Button>
          <Button appearance="subtle" size="small" onClick={() => setIsEditing(false)} icon={<DismissRegular />}>
            Cancel
          </Button>
          {baseGoal !== DEFAULT_GOAL && (
            <Button appearance="subtle" size="small" onClick={handleResetGoal}>
              Reset to 100
            </Button>
          )}
        </div>
      )}

      {saveSuccess && (
        <Caption1 style={{ color: '#059669', fontWeight: 600 }}>
          ✓ {saveSuccess}
        </Caption1>
      )}

      {/* Stats Counter & Goal Status */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className={styles.statGroup}>
          <p className={styles.bigCount}>{currentCount}</p>
          <span style={{ fontSize: '0.9rem', color: 'var(--sandoz-text-muted)', fontWeight: 600 }}>
            / {effectiveGoal} kindness posts
          </span>
          <Caption1 style={{ color: 'var(--sandoz-text-muted)', marginLeft: '6px' }}>
            ({kindnessSharePercent}% of all recognition posts)
          </Caption1>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: isGoalReached ? '#D97706' : 'var(--sandoz-blue)' }}>
            {progressPercent}% completed
          </span>
          {isGoalReached && (
            <div style={{ fontSize: '0.72rem', color: '#92400E', fontWeight: 600 }}>
              Extended beyond original {baseGoal} goal
            </div>
          )}
        </div>
      </div>

      {/* Visual Progress Bar with Dynamic Extension & Goal Marker */}
      <div style={{ position: 'relative', marginTop: isGoalReached ? '14px' : '4px' }}>
        <div className={styles.progressBarTrack}>
          {/* Main Progress Bar Fill */}
          <div
            className={`${styles.progressBarFill} ${isGoalReached ? styles.fillExtended : styles.fillNormal}`}
            style={{ width: `${progressPercent}%` }}
          />

          {/* Original Milestone Marker if extended */}
          {isGoalReached && baseGoalPositionPercent < 100 && (
            <>
              <div
                className={styles.markerLine}
                style={{ left: `${baseGoalPositionPercent}%` }}
              />
              <div
                className={styles.markerBadge}
                style={{ left: `${baseGoalPositionPercent}%` }}
              >
                ★ {baseGoal} Goal Achieved
              </div>
            </>
          )}
        </div>

        {/* Scale Numbers Beneath the Bar */}
        <div className={styles.scaleRow}>
          <Caption1 style={{ color: 'var(--sandoz-text-muted)', fontWeight: 600 }}>0</Caption1>
          {isGoalReached && (
            <Caption1 style={{ color: '#92400E', fontWeight: 700 }}>
              {baseGoal} (Achieved ✓)
            </Caption1>
          )}
          <Caption1 style={{ color: 'var(--sandoz-navy)', fontWeight: 700 }}>
            {effectiveGoal} posts target {isGoalReached ? `(+${effectiveGoal - baseGoal} extended)` : ''}
          </Caption1>
        </div>
      </div>

      {/* Extended Goal Banner Notice */}
      {isGoalReached && (
        <div className={styles.bannerCelebration}>
          <CheckmarkCircleRegular style={{ fontSize: '18px', color: '#059669', flexShrink: 0 }} />
          <span>
            Goal of <strong>{baseGoal} kindness posts reached</strong>! The progress bar has been automatically extended to{' '}
            <strong>{effectiveGoal} posts</strong> to keep tracking our collective impact.
          </span>
        </div>
      )}
    </div>
  );
};
