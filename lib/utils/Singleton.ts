/**
 * Generic singleton base class.
 * Provides a type-safe getInstance() pattern for singleton services.
 *
 * @example
 * class MyService extends Singleton<MyService> {
 *   private constructor() {
 *     super();
 *     // initialization
 *   }
 *
 *   // Required: return the static instance storage
 *   protected static override instanceRef: MyService | undefined;
 *
 *   static override getInstance(): MyService {
 *     return Singleton.getInstanceOf(MyService, () => new MyService());
 *   }
 * }
 */
export abstract class Singleton<T> {
  /**
   * Instance storage - each subclass should override this with its own static property
   */
  protected static instanceRef: unknown;

  /**
   * Protected constructor to prevent direct instantiation
   */
  protected constructor() {
    // Subclasses must call super() in their private constructors
  }

  /**
   * Type-safe getInstance helper for subclasses.
   * Call this from the static getInstance() method of each subclass.
   *
   * @param ctor - The class constructor (used for type inference)
   * @param factory - Factory function to create the instance
   * @returns The singleton instance
   */
  protected static getInstanceOf<C extends Singleton<C>>(
    ctor: new (...args: never[]) => C,
    factory: () => C
  ): C {
    // Access the static instanceRef on the actual subclass
    const ref = (ctor as unknown as { instanceRef?: C }).instanceRef;
    if (!ref) {
      const instance = factory();
      (ctor as unknown as { instanceRef: C }).instanceRef = instance;
      return instance;
    }
    return ref;
  }

  /**
   * Reset the singleton instance (useful for testing).
   * Each subclass should expose this if needed for testing.
   */
  protected static resetInstance<C extends Singleton<C>>(
    ctor: new (...args: never[]) => C
  ): void {
    (ctor as unknown as { instanceRef?: C }).instanceRef = undefined;
  }
}

/**
 * Alternative simpler pattern using a decorator-like approach.
 * Use createSingleton for services that don't need class inheritance.
 *
 * @example
 * const { getInstance, resetInstance } = createSingleton(() => new MyService());
 */
export function createSingleton<T>(factory: () => T): {
  getInstance: () => T;
  resetInstance: () => void;
} {
  let instance: T | undefined;

  return {
    getInstance: () => {
      if (!instance) {
        instance = factory();
      }
      return instance;
    },
    resetInstance: () => {
      instance = undefined;
    },
  };
}
