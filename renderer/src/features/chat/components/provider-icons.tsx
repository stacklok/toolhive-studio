import React from 'react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/common/components/ui/tooltip'

// Provider SVG icons for the UI
const PROVIDER_ICONS: Record<string, React.ReactElement> = {
  openai: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="118 120 480 480"
      fill="currentColor"
      className="size-4"
    >
      <path d="M304.246 295.411V249.828C304.246 245.989 305.687 243.109 309.044 241.191L400.692 188.412C413.167 181.215 428.042 177.858 443.394 177.858C500.971 177.858 537.44 222.482 537.44 269.982C537.44 273.34 537.44 277.179 536.959 281.018L441.954 225.358C436.197 222 430.437 222 424.68 225.358L304.246 295.411ZM518.245 472.945V364.024C518.245 357.304 515.364 352.507 509.608 349.149L389.174 279.096L428.519 256.543C431.877 254.626 434.757 254.626 438.115 256.543L529.762 309.323C556.154 324.679 573.905 357.304 573.905 388.971C573.905 425.436 552.315 459.024 518.245 472.941V472.945ZM275.937 376.982L236.592 353.952C233.235 352.034 231.794 349.154 231.794 345.315V239.756C231.794 188.416 271.139 149.548 324.4 149.548C344.555 149.548 363.264 156.268 379.102 168.262L284.578 222.964C278.822 226.321 275.942 231.119 275.942 237.838V376.986L275.937 376.982ZM360.626 425.922L304.246 394.255V327.083L360.626 295.416L417.002 327.083V394.255L360.626 425.922ZM396.852 571.789C376.698 571.789 357.989 565.07 342.151 553.075L436.674 498.374C442.431 495.017 445.311 490.219 445.311 483.499V344.352L485.138 367.382C488.495 369.299 489.936 372.179 489.936 376.018V481.577C489.936 532.917 450.109 571.785 396.852 571.785V571.789ZM283.134 464.79L191.486 412.01C165.094 396.654 147.343 364.029 147.343 332.362C147.343 295.416 169.415 262.309 203.48 248.393V357.791C203.48 364.51 206.361 369.308 212.117 372.665L332.074 442.237L292.729 464.79C289.372 466.707 286.491 466.707 283.134 464.79ZM277.859 543.48C223.639 543.48 183.813 502.695 183.813 452.314C183.813 448.475 184.294 444.636 184.771 440.797L279.295 495.498C285.051 498.856 290.812 498.856 296.568 495.498L417.002 425.927V471.509C417.002 475.349 415.562 478.229 412.204 480.146L320.557 532.926C308.081 540.122 293.206 543.48 277.854 543.48H277.859ZM396.852 600.576C454.911 600.576 503.37 559.313 514.41 504.612C568.149 490.696 602.696 440.315 602.696 388.976C602.696 355.387 588.303 322.762 562.392 299.25C564.791 289.173 566.231 279.096 566.231 269.024C566.231 200.411 510.571 149.067 446.274 149.067C433.322 149.067 420.846 150.984 408.37 155.305C386.775 134.192 357.026 120.758 324.4 120.758C266.342 120.758 217.883 162.02 206.843 216.721C153.104 230.637 118.557 281.018 118.557 332.357C118.557 365.946 132.95 398.571 158.861 422.083C156.462 432.16 155.022 442.237 155.022 452.309C155.022 520.922 210.682 572.266 274.978 572.266C287.931 572.266 300.407 570.349 312.883 566.028C334.473 587.141 364.222 600.576 396.852 600.576Z" />
    </svg>
  ),

  anthropic: (
    <svg
      className="size-4"
      viewBox="0 0 46 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <title>Anthropic</title>
      <path d="M32.73 0h-6.945L38.45 32h6.945L32.73 0ZM12.665 0 0 32h7.082l2.59-6.72h13.25l2.59 6.72h7.082L19.929 0h-7.264Zm-.702 19.337 4.334-11.246 4.334 11.246h-8.668Z" />
    </svg>
  ),

  google: (
    <svg
      className="size-4"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <title>Gemini</title>
      <path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" />
    </svg>
  ),

  xai: (
    <svg
      viewBox="0 0 33 32"
      className="size-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <g>
        <path d="M12.745 20.54l10.97-8.19c.539-.4 1.307-.244 1.564.38 1.349 3.288.746 7.241-1.938 9.955-2.683 2.714-6.417 3.31-9.83 1.954l-3.728 1.745c5.347 3.697 11.84 2.782 15.898-1.324 3.219-3.255 4.216-7.692 3.284-11.693l.008.009c-1.351-5.878.332-8.227 3.782-13.031L33 0l-4.54 4.59v-.014L12.743 20.544m-2.263 1.987c-3.837-3.707-3.175-9.446.1-12.755 2.42-2.449 6.388-3.448 9.852-1.979l3.72-1.737c-.67-.49-1.53-1.017-2.515-1.387-4.455-1.854-9.789-.931-13.41 2.728-3.483 3.523-4.579 8.94-2.697 13.561 1.405 3.454-.899 5.898-3.22 8.364C1.49 30.2.666 31.074 0 32l10.478-9.466" />
      </g>
    </svg>
  ),

  openrouter: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      stroke="currentColor"
      className="size-4"
    >
      <g clipPath="url(#clip0_205_3)">
        <path
          d="M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945"
          strokeWidth="90"
        />
        <path d="M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" />
        <path
          d="M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377"
          strokeWidth="90"
        />
        <path d="M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" />
      </g>
    </svg>
  ),
}

// Provider names for tooltips
const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  openrouter: 'OpenRouter',
}
// Get provider icon wrapped with tooltip
function getProviderIconWithTooltip(
  providerId: string
): React.ReactElement | null {
  const icon = PROVIDER_ICONS[providerId]
  const name = PROVIDER_NAMES[providerId]

  if (!icon || !name) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center">{icon}</span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  )
}

function getProviderIdFromModel(model: string): string | null {
  if (!model) return null

  // Handle OpenRouter models with prefixes
  if (model.includes('/')) {
    return 'openrouter'
  }

  // Handle direct provider models
  if (model.startsWith('claude-')) return 'anthropic'
  if (model.startsWith('gemini-')) return 'google'
  if (model.startsWith('grok-')) return 'xai'
  if (
    model.startsWith('gpt-') ||
    model.startsWith('o3') ||
    model.startsWith('o4')
  )
    return 'openai'

  return null
}

// Get provider icon by model (without tooltip)
export function getProviderIconByModel(
  model: string
): React.ReactElement | null {
  if (!model) return null
  const providerId = getProviderIdFromModel(model)
  if (!providerId) return null
  return getProviderIconWithTooltip(providerId) || null
}

export function getProviderIcon(providerId: string): React.ReactElement | null {
  return getProviderIconWithTooltip(providerId) || null
}
