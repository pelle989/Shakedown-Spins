declare global {
  namespace Auth {
    interface Session {
      user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
    }
  }

  namespace App {
    interface Error {
      message: string;
    }

    interface PageData {
      session?: import('@auth/core/types').Session | null;
    }
  }
}

export {};
