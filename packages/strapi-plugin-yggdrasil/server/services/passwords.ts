import type { StrapiInstance } from '../types';

type UsersPermissionsUserService = {
  validatePassword(plain: string, hashed: string): Promise<boolean>;
};

/**
 * Thin wrapper around `users-permissions.user.validatePassword`. We
 * isolate it so the auth controller does not import u-p's service
 * surface directly and tests can stub it out.
 */
export type PasswordsService = ReturnType<typeof createPasswordsService>;

export const createPasswordsService = ({ strapi }: { strapi: StrapiInstance }) => ({
  async validate(plain: string, hashed: string): Promise<boolean> {
    if (!plain || !hashed) return false;
    const service = strapi
      .plugin('users-permissions')
      .service('user') as UsersPermissionsUserService;
    return service.validatePassword(plain, hashed);
  },
});
