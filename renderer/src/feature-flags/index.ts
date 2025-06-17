import features from './toggles.json'

export function isFeatureEnabled(feature: string): boolean {
  return features[feature] === true
}
