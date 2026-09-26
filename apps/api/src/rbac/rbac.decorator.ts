import { SetMetadata } from '@nestjs/common';

import type { PermissionCode } from './rbac.constants.js';

export const RBAC_PERMISSIONS_KEY = 'rbac_permissions';

export const RequirePermissions = (
  ...permissions: PermissionCode[]
) => SetMetadata(RBAC_PERMISSIONS_KEY, permissions);