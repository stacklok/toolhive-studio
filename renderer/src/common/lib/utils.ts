import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if an environment variable value is effectively empty (null, undefined, or whitespace-only).
 * This is used consistently across form validation and orchestration logic for environment variables.
 */
export function isEmptyEnvVar(value: string | undefined | null): boolean {
  return !value || value.trim() === ''
}

export function getVolumes(
  volumes: Array<{
    host: string
    container: string
    accessMode?: 'ro' | 'rw'
  }>
): Array<string> {
  return volumes
    .filter((volume) => volume.host && volume.container)
    .map(
      (volume) =>
        `${volume.host}:${volume.container}${volume.accessMode === 'ro' ? ':ro' : ''}`
    )
}
