import type { SVGProps } from 'react'
export const IllustrationMug = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 136 136"
    fill="none"
    {...props}
  >
    <path
      fill="var(--background)"
      fillRule="evenodd"
      stroke="var(--ring)"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="m42.378 106.192 1.49-.051v20.999c0 .475.387.86.864.86h51.84a.862.862 0 0 0 .864-.86V55.155A3.162 3.162 0 0 0 94.268 52H47.036a3.162 3.162 0 0 0-3.168 3.155v14.968l-1.49-.052c-.175-.006-.35-.009-.526-.009-9.035 0-16.416 8.062-16.416 18.07 0 10.007 7.38 18.07 16.416 18.07.176 0 .351-.003.526-.01zm.165-6.902a8.69 8.69 0 0 1-.691.028c-5.453 0-9.773-5.055-9.773-11.186s4.32-11.186 9.773-11.186c.231 0 .462.009.691.027l1.325.106v22.105l-1.325.106z"
      clipRule="evenodd"
    />
    <path
      stroke="var(--ring)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M89.436 58.182V76.5m0 5.682v4.743-4.743zM9.564 120h6.872m107.128 0h2.872m-23 0h15.428m-96.428 0H39.89"
    />
    <path
      stroke="var(--border)"
      strokeLinecap="round"
      strokeWidth={2.5}
      d="M70.436 8c-2.667 4.213-4 7.88-4 11 0 5.556 4.654 8.044 4.654 14.063 0 3.055-1.551 6.088-4.654 9.1m-8-23.163c-.872 5.513 3 6.532 3 11.475 0 2.508-1 5.017-3 7.525m18.795-21.526c-1.32 3.42-.579 5.503 0 6.73 1.238 2.622 3.205 4.886 3.205 7.554 0 3.099-1.068 6.081-3.205 8.947"
    />
    <path
      fill="var(--muted)"
      d="M47.436 57a1 1 0 0 1 1-1h19v69h-19a1 1 0 0 1-1-1V57z"
    />
  </svg>
)
