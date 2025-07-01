import { TopNavContainer } from './container'
import { TopNavLogo } from './logo'
import { WindowControls } from './window-controls'

export function TopNavMinimal() {
  return (
    <TopNavContainer className="!flex justify-between">
      <TopNavLogo />
      <WindowControls />
    </TopNavContainer>
  )
}
