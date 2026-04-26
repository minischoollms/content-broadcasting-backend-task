import { createUser, findUserByEmail } from '../models/user.model';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { toPublicUser, type PublicUser, type Role } from '../models/types';

export async function register(params: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ token: string; user: PublicUser }> {
  const existing = await findUserByEmail(params.email);
  if (existing) throw ApiError.conflict('Email already registered');

  const user = await createUser({
    name: params.name,
    email: params.email,
    passwordHash: await hashPassword(params.password),
    role: params.role,
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  return { token, user: toPublicUser(user) };
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const user = await findUserByEmail(email);
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  return { token, user: toPublicUser(user) };
}
