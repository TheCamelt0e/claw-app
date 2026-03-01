declare module 'expo-camera' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export type CameraType = 'front' | 'back';

  export interface CameraViewProps extends ViewProps {
    facing?: CameraType;
  }

  export interface CameraPictureOptions {
    quality?: number;
    base64?: boolean;
  }

  export interface CameraPictureResult {
    uri: string;
    base64?: string;
  }

  export class CameraView extends React.Component<CameraViewProps> {
    takePictureAsync(options?: CameraPictureOptions): Promise<CameraPictureResult>;
  }

  export interface CameraPermissionResponse {
    granted: boolean;
    status: string;
  }

  export function useCameraPermissions(): [
    CameraPermissionResponse | undefined,
    () => Promise<void>
  ];
}
