import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let roles: string[] | undefined;
  let usuario: { esAdmin: boolean; esVendedor: boolean };
  const reflector = {
    getAllAndOverride: jest.fn(() => roles),
  } as unknown as Reflector;
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: usuario }),
    }),
  } as unknown as ExecutionContext;
  const guard = new RolesGuard(reflector);

  beforeEach(() => {
    roles = ['vendedor'];
    usuario = { esAdmin: false, esVendedor: true };
  });

  it('allows a user with the seller role', () => {
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects users without the requested role', () => {
    usuario.esVendedor = false;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('continues to allow administrators on admin routes', () => {
    roles = ['admin'];
    usuario = { esAdmin: true, esVendedor: false };
    expect(guard.canActivate(context)).toBe(true);
  });
});
