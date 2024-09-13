declare module 'dxf' {
  class Helper {
    constructor(dxfString: string);
    parsed: {
      entities: Array<{
        type: string;
        vertices?: Array<{ x: number; y: number; z: number }>;
        start?: { x: number; y: number; z: number };
        end?: { x: number; y: number; z: number };
        // Add other properties as needed
      }>;
      // Add other properties as needed
    };
  }
}