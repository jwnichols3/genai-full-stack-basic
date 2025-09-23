import { EC2Instance } from '@ec2-manager/shared';

export const getInstanceName = (instance: EC2Instance): string => {
  return instance.tags.Name ?? instance.instanceId;
};

export const formatInstanceIp = (ip: string | null | undefined): string => {
  return ip ?? 'N/A';
};

export const formatInstanceType = (instanceType: string): string => {
  return instanceType;
};

export const formatLaunchTime = (launchTime: string): string => {
  return new Date(launchTime).toLocaleString();
};

export const getInstanceAge = (launchTime: string): string => {
  const now = new Date();
  const launch = new Date(launchTime);
  const diffMs = now.getTime() - launch.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours % 24}h`;
  } else if (diffHours > 0) {
    return `${diffHours}h`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m`;
  }
};