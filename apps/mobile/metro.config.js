// 모노레포 구성: apps/mobile 밖(packages/tokens)의 소스를 Metro가 추적하도록 한다.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// disableHierarchicalLookup 은 켜지 않는다. expo/metro-config 가 모노레포를 이미 다루고,
// 켜두면 워크스페이스 밖 패키지를 못 찾는다 (expo-doctor 권고값 false).

module.exports = config;
