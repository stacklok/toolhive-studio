import features from './toggles.json' assert { type: 'json' }

type FeatureName = keyof typeof features

export function isFeatureEnabled(feature: FeatureName): boolean {
  return features[feature] === true
}
