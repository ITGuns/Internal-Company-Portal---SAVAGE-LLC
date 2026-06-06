import React from 'react'
import IconButton from './IconButton'
import BrandLogo from '../assets/icons/BrandLogo'
import UserAvatar from '../assets/icons/UserAvatar'
import Icon from './Icon'
import { Settings, Plus } from 'lucide-react'

export default function IconDemo() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Icon Demo</h3>
      <div className="flex items-center gap-4">
        <IconButton label="Brand" icon={BrandLogo} endIcon={UserAvatar} />
        <IconButton label="New Task" icon={Plus} endIcon={Settings} />
        <div className="flex items-center gap-2">
          <Icon component={Settings} size={18} decorative={false} />
          <span>Settings (lucide via Icon wrapper)</span>
        </div>
      </div>
    </div>
  )
}
