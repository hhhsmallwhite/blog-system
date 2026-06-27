/**
 * passport-custom 类型声明
 * 社区包 passport-custom 无 @types 包，此处声明基础类型
 */
declare module 'passport-custom' {
  import { Strategy as PassportStrategy } from 'passport';

  export class Strategy extends PassportStrategy {
    constructor(
      verify: (req: Express.Request, done: (error: any, user?: any, info?: any) => void) => void,
    );
    constructor(
      options: any,
      verify: (req: Express.Request, done: (error: any, user?: any, info?: any) => void) => void,
    );
  }
}
