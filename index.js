import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether we load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
