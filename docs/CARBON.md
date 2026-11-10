### Run the react-router-vite example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/examples/react-router-vite/README.md

Navigate to the example directory, install dependencies, and start the development server.

```sh
cd examples/react-router-vite && yarn install && yarn dev
```

--------------------------------

### Install dependencies and start dev server

Source: https://github.com/carbon-design-system/carbon/blob/main/examples/custom-theme/README.md

After building, cd into the directory and run these commands to install dependencies and start the development server. Use either yarn or npm.

```sh
yarn install
# or
npm install


yarn dev
# or
npm run dev
```

--------------------------------

### Install dependencies and build (yarn install && yarn build)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/examples/preview/README.md

Initial setup command for the carbon repository. Run this from the repository root before proceeding.

```sh
yarn install && yarn build

```

--------------------------------

### Getting started imports for API key generation

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/GenerateAnAPIKey/GenerateAnAPIKey.mdx

Import Carbon React components and icons needed for the Generate an API key example. This is the first step in the Getting started section.

```jsx
import { Button, Modal, TextInput, PasswordInput } from '@carbon/react';
import { InformationFilled, CheckmarkFilled } from '@carbon/react/icons';
```

--------------------------------

### Run development server

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/example/README.md

Starts the local development server. Open the URL shown in the terminal, typically http://localhost:5173.

```bash
yarn dev
```

--------------------------------

### Install and build carbon repository

Source: https://github.com/carbon-design-system/carbon/blob/main/examples/custom-theme/README.md

Run this command in the root of the carbon repository to install dependencies and build the project before starting the development server.

```sh
yarn install && yarn build
```

--------------------------------

### Install @carbon/themes with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Alternative installation command for projects using Yarn.

```bash
yarn add @carbon/themes
```

--------------------------------

### Install Yarn on WSL

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Install Yarn by adding the Yarn repository key, adding the repository to sources.list, and installing Yarn via apt.

```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
```

```bash
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
```

```bash
sudo apt-get update && sudo apt-get install yarn
```

--------------------------------

### Install dependencies with empty yarn.lock

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/example/README.md

Creates an empty yarn.lock (gitignored) and installs dependencies. Without the lockfile, Yarn walks up to the root project and fails with 'The nearest package directory [...] doesn't seem to be part of the project'.

```bash
: > yarn.lock   # gitignored
yarn install
```

--------------------------------

### Install with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Install @carbon/icon-helpers using Yarn.

```bash
yarn add @carbon/icon-helpers
```

--------------------------------

### Install @carbon/grid with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/README.md

Install @carbon/grid using npm.

```bash
npm install -S @carbon/grid
```

--------------------------------

### Install with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-build-helpers/README.md

Install the package using npm.

```bash
npm install -S @carbon/icon-build-helpers
```

--------------------------------

### Install @carbon/grid with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/README.md

Install @carbon/grid using Yarn.

```bash
yarn add @carbon/grid
```

--------------------------------

### Install with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-build-helpers/README.md

Install the package using Yarn.

```bash
yarn add @carbon/icon-build-helpers
```

--------------------------------

### Install with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Install @carbon/icon-helpers using npm.

```bash
npm install -S @carbon/icon-helpers
```

--------------------------------

### Complete usage example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Full example initializing AddSelectData, setting hierarchical items, selecting, searching, navigating, checking selection, getting depth, checking descendants, getting top-level selections, and sorting.

```typescript
import { AddSelectData, AddSelectItem } from '@carbon/utilities';

// Initialize the data manager
const dataManager = new AddSelectData();

// Set up hierarchical data
const items: AddSelectItem[] = [
  {
    id: '1',
    title: 'California',
    value: 'ca',
    subtitle: 'West Coast',
    children: {
      entries: [
        { id: '1-1', title: 'Los Angeles', value: 'la' },
        { id: '1-2', title: 'San Francisco', value: 'sf' },
      ],
    },
  },
  {
    id: '2',
    title: 'Texas',
    value: 'tx',
    subtitle: 'South',
  },
];

dataManager.setItems(items);

// Select an item
dataManager.setSelectedItems('1-1', true);

// Search for items
const searchResults = dataManager.search('los');

// Navigate hierarchy
const children = dataManager.getItemChildren('1');
const parent = dataManager.getItemParent('1-1');
const ancestors = dataManager.getItemParents('1-1');

// Check selection
if (dataManager.isSelected('1-1')) {
  console.log('Los Angeles is selected');
}

// Get depth
const depth = dataManager.getItemDepth('1-1'); // Returns 1

// Check descendants
if (dataManager.hasSelectedDescendants('1')) {
  console.log('California has selected descendants');
}

// Get top-level selections
const topLevel = dataManager.getTopLevelSelectedItems();

// Sort items
dataManager.sort((a, b) => a.title!.localeCompare(b.title!), true);
```

--------------------------------

### Install @carbon/icons-vue with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/README.md

Install @carbon/icons-vue using npm.

```bash
npm install -S @carbon/icons-vue
```

--------------------------------

### Install prerequisites for Carbon development on WSL

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Commands to update Ubuntu repositories, install build-essential, source the updated .bashrc, install the latest LTS Node release via nvm, and install Python 2.

```bash
sudo apt-get update
```

```bash
sudo apt install build-essential
```

```bash
source ~/.bashrc
```

```bash
nvm install --lts
```

```bash
sudo apt install python2-minimal
```

--------------------------------

### Change to projects directory

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Change into your projects folder (example path).

```bash
cd /mnt/c/Users/{username}/projects
```

--------------------------------

### Install @carbon/icons-vue with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/README.md

Install @carbon/icons-vue using Yarn.

```bash
yarn add @carbon/icons-vue
```

--------------------------------

### Install and build Carbon

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Install dependencies and build the project in the root folder of the cloned repo.

```bash
yarn install
```

```bash
yarn build
```

--------------------------------

### Install @carbon/themes with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Install the package using npm. Use this command in your project directory.

```bash
npm install -S @carbon/themes
```

--------------------------------

### NumberInput with stepStartValue for custom start value

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/NumberInput/NumberInput.mdx

Use this example to set a custom starting value for the stepper buttons when the input is empty. The stepStartValue prop provides a more beneficial starting point than zero, such as the current year, while still allowing the input to remain empty initially.

```jsx
<NumberInput
  type="text"
  value={1000}
  stepStartValue={10}
/>
```

--------------------------------

### Install @carbon/web-components with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/welcome.mdx

Use this command to install the package via npm. This is the first step for using the components in a project.

```bash
npm install --save @carbon/web-components
```

--------------------------------

### Install @carbon/styles with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Use this command to install the package via Yarn.

```bash
yarn add @carbon/styles
```

--------------------------------

### Install @carbon/elements with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Installs the @carbon/elements package using Yarn.

```bash
yarn add @carbon/elements
```

--------------------------------

### Install @carbon/elements with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Installs the @carbon/elements package using npm.

```bash
npm install -S @carbon/elements
```

--------------------------------

### Install with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/README.md

Install the @carbon/utilities package using the Yarn package manager.

```bash
yarn add @carbon/utilities
```

--------------------------------

### Manually run an example app with sentinel yarn.lock

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Create an empty `yarn.lock` sentinel before installing to avoid Yarn walking up to the root project. Without it, Yarn fails with 'The nearest package directory [...] doesn't seem to be part of the project'.

```bash
cd packages/colors/examples/preview
: > yarn.lock   # gitignored
yarn install
yarn develop
```

--------------------------------

### enable-v12-release codemod example (before/after)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the transformation applied by the enable-v12-release codemod: wrapping the app with <FeatureFlags enableV12Release> and adding the necessary import.

```jsx
// Before
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// After
import { createRoot } from 'react-dom/client';
import { FeatureFlags } from '@carbon/react';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
  <FeatureFlags enableV12Release>
    <App />
  </FeatureFlags>
);
```

--------------------------------

### Install with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-react/README.md

Installs the package using Yarn as an alternative to npm.

```bash
yarn add @carbon/icons-react
```

--------------------------------

### Slug to decorator migration example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after of the `slug` prop to `decorator` prop migration.

```jsx
// Before
<Component slug="my-identifier">Content</Component>

// After
<Component decorator="my-identifier">Content</Component>
```

--------------------------------

### Import Carbon styles with @use

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Imports all Carbon Design System styles. This is the recommended way to get started with @carbon/styles, which uses the Sass module system. The package can be replaced with @carbon/react if using that framework variant.

```scss
@use '@carbon/styles';
```

--------------------------------

### Install @carbon/cli with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/cli/README.md

Install @carbon/cli as a dependency using npm.

```bash
npm install -S @carbon/cli
```

--------------------------------

### Install with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/README.md

Install the @carbon/utilities package using the npm package manager.

```bash
npm install @carbon/utilities
```

--------------------------------

### build command implementation

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/building-an-icon-library.md

Example implementation of the build command that uses @carbon/cli-reporter for logging, reads meta from @carbon/icons/meta.json, writes ESM modules, and compiles to CJS with tsdown. Includes comments for extending with entrypoints and examples.

```javascript
'use strict';

// Reporter for logging information to the console
// Useful for `reporter.info`, `reporter.success`, `reporter.error`, etc.
const { reporter } = require('@carbon/cli-reporter');

// Meta information from the icons build process
const meta = require('@carbon/icons/meta.json');

const fs = require('fs-extra');
const path = require('path');

async function build({ cwd }) {
  const { build: tsdown } = await import('tsdown');

  // Define our bundle entrypoints for ESM and CJS
  const ESM_DIR = path.join(cwd, 'es');
  const BUNDLE_TARGETS = [
    {
      format: 'commonjs',
      directory: 'lib',
    },
  ];

  reporter.info('Building ESM and CJS sources...');

  // Use the fan-out pattern with Promise.all to try and make these tasks run in
  // parallel
  await Promise.all(
    // `meta` is a map that provides a hash of information about the current
    // icon to build
    meta.map(async (info) => {
      // Typically, implementations will have a way to create a source module
      // from a source file and use that to write to the ESM path.
      const source = createModuleFromInfo(info);
      const jsFilepath = path.join(cwd, info.outputOptions.file);

      await fs.ensureDir(path.dirname(jsFilepath));
      await fs.writeFile(jsFilepath, source);

      // Afterwards, compile the ESM module to CJS with tsdown
      await Promise.all(
        BUNDLE_TARGETS.map(async ({ format, directory }) => {
          await tsdown({
            entry: [jsFilepath],
            format: [format],
            outDir: path.dirname(
              jsFilepath.replace(/\/es\//, `/${directory}/`)
            ),
            clean: false,
            dts: false,
            external: ['@carbon/icon-helpers', 'prop-types', 'react'],
          });
        })
      );
    })
  );

  // Afterwards, you should try and construct an entrypoint of all icons for
  // your library under `es/index.js`. It's important that this entrypoint is
  // tree-shakeable given the size of our library
  reporter.info('Building ESM and CJS entrypoints...');

  // You can then use `BUNDLE_TARGETS` again to generate CJS entrypoints

  // After constructing all the necessary module files, feel free to use this to
  // generate example information in the `examples` directory

  // And then we're all done!
  reporter.success('Done! 🎉');
}

module.exports = build;
```

--------------------------------

### Install @carbon/pictograms with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/pictograms/README.md

Install the @carbon/pictograms package using npm. This is the recommended installation method for projects using npm.

```bash
npm install -S @carbon/pictograms
```

--------------------------------

### Install @carbon/cli with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/cli/README.md

Install @carbon/cli as a dependency using Yarn.

```bash
yarn add @carbon/cli
```

--------------------------------

### Install with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/config/typescript-config-carbon/README.md

Install typescript-config-carbon as a dependency using npm.

```bash
npm install -S typescript-config-carbon
```

--------------------------------

### Install @carbon/colors with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Alternative installation command for projects using Yarn.

```bash
yarn add @carbon/colors
```

--------------------------------

### Install @carbon/icons with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons/README.md

Installs the @carbon/icons package into your project using Yarn.

```bash
yarn add @carbon/icons
```

--------------------------------

### Install with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/config/typescript-config-carbon/README.md

Install typescript-config-carbon as a dependency using Yarn.

```bash
yarn add typescript-config-carbon
```

--------------------------------

### Install @carbon/styles with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Use this command to install the package via npm.

```bash
npm install -S @carbon/styles
```

--------------------------------

### Range Selection State Machine Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Shows how to use the DatePickerStateMachine in range mode, including opening the calendar, selecting start and end dates, and observing the state and context changes. The calendar closes automatically when closeOnSelect is true.

```typescript
// Range mode
const machine = new DatePickerStateMachine({
  mode: 'range',
  closeOnSelect: true,
});

// Open calendar
machine.send(DatePickerEvent.CALENDAR_OPEN);
// State: CALENDAR_OPEN

// Select start date
machine.send(DatePickerEvent.RANGE_START_SELECT, {
  date: new Date('2024-01-15'),
});
// State: SELECTING_END
// Context: { startDate: 2024-01-15, endDate: null }

// Select end date
machine.send(DatePickerEvent.RANGE_END_SELECT, {
  date: new Date('2024-01-20'),
});
// State: DATE_SELECTED
// Context: { startDate: 2024-01-15, endDate: 2024-01-20, value: '2024-01-15/2024-01-20' }
// Calendar closes automatically
```

--------------------------------

### Install dependencies with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Command to install the required Carbon packages using npm.

```bash
npm i carbon-components carbon-components-react carbon-icons --save
```

--------------------------------

### Start React Storybook for Playwright Testing

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/testing.md

Start the React Storybook locally from the project root before running Playwright tests against React components.

```bash
cd packages/react
yarn storybook
```

--------------------------------

### Install @carbon/icons with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons/README.md

Installs the @carbon/icons package into your project using npm.

```bash
npm install -S @carbon/icons
```

--------------------------------

### Light to layer migration example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after of the `light` prop migration. The `light` prop is removed and the component is wrapped with `<Layer>`, with the `Layer` import added.

```jsx
// Before
import { Button } from '@carbon/react';

<Button light>Click me</Button>;

// After
import { Button, Layer } from '@carbon/react';

<Layer>
  <Button>Click me</Button>
</Layer>;
```

--------------------------------

### Install @carbon/feature-flags with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/feature-flags/README.md

Install the @carbon/feature-flags package using Yarn.

```bash
yarn add @carbon/feature-flags
```

--------------------------------

### DatePicker datePickerType range example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Renders a range picker with two DatePickerInput children, one for start and one for end.

```jsx
<DatePicker datePickerType="range">
  <DatePickerInput placeholder="Start" />
  <DatePickerInput placeholder="End" />
</DatePicker>
```

--------------------------------

### Install dependencies with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Command to install the required Carbon packages using Yarn.

```bash
yarn add carbon-components-react carbon-components carbon-icons
```

--------------------------------

### Install a dependency with yarn add

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run `yarn add <dependency-name>` to install a dependency. After adding or updating dependencies, commit the updated lockfile and manifest files (e.g., `yarn.lock` and `package.json`). For example apps, commit only the `package.json` change, never the lockfile.

```bash
yarn add <dependency-name>
```

--------------------------------

### Install stylelint-config-carbon with npm or Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/config/stylelint-config-carbon/README.md

Install stylelint-config-carbon with npm or Yarn. Choose the command for your package manager.

```bash
npm install -S stylelint-config-carbon
```

```bash
yarn add stylelint-config-carbon
```

--------------------------------

### Install @carbon/icons-react with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/release-partners.md

Install the latest version of `@carbon/icons-react` to try out the new icon updates. This is the Yarn command.

```bash
yarn add @carbon/icons-react@^10.32.0
```

--------------------------------

### Install @carbon/icons-react with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/release-partners.md

Install the latest version of `@carbon/icons-react` to try out the new icon updates. This is the npm command.

```bash
npm i @carbon/icons-react@^10.32.0
```

--------------------------------

### Install @carbon/type with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Install the package using npm. Run this command in your project directory.

```bash
npm install -S @carbon/type
```

--------------------------------

### Sass color variable naming convention

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Color variables follow the pattern <swatch>-<grade>, as shown in these examples.

```scss
colors.$blue-50;
colors.$cool-gray-10;
colors.$black-100;
colors.$white-0;
```

--------------------------------

### Run @carbon/cli --help with npx

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/cli/README.md

Run @carbon/cli without installing it locally, using npx. The --help option displays usage information.

```bash
npx @carbon/cli --help
```

--------------------------------

### Import TruncatedText component (JavaScript)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/truncated-text/truncated-text.mdx

Import the TruncatedText web component module to use it in your application. This is the first step in getting started with the component.

```javascript
import '@carbon/web-components/es/components/truncated-text/index.js';
```

--------------------------------

### Install @carbon/feature-flags with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/feature-flags/README.md

Install the @carbon/feature-flags package using npm.

```bash
npm install -S @carbon/feature-flags
```

--------------------------------

### Install @carbon/upgrade with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Installs the @carbon/upgrade package as a dependency using Yarn.

```bash
yarn add @carbon/upgrade
```

--------------------------------

### Configure theme and use theme.get

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Imports the theme entrypoint with a custom theme and uses the theme.get function to access a token value.

```scss
@use '@carbon/styles/scss/theme';
@use '@carbon/styles/scss/theme' with (
  $theme: (
    custom-token: #bada44,
  )
);

.my-selector {
  background: rgba(theme.get('custom-token'), 0.1);
}
```

--------------------------------

### Example usage of IBM Plex Sans from CDN

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.mdx

Shows how to include the IBM Plex Sans stylesheet from the Carbon CDN and apply the font family to the body. The example uses a <link> tag in the head and a CSS style rule.

```html
<html>
  <head>
    <link
      rel="stylesheet"
      href="https://1.www.s81c.com/common/carbon/plex/sans.css" />
    <style>
      body {
        font-family:
          IBM Plex Sans,
          Helvetica Neue,
          Arial,
          sans-serif;
      }
    </style>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

--------------------------------

### Example output of wc-report-non-barrel-imports

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Shows the report format listing files and the barrel each import should become.

```text
src/app.js  (2 need a barrel)
  ├─ L1  button/button.js  (side-effect)  →  button/index.js
  └─ L2  tag/tag.js        (side-effect)  →  tag/index.js
```

--------------------------------

### Install @carbon/type with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Install the package using Yarn as an alternative to npm.

```bash
yarn add @carbon/type
```

--------------------------------

### Install @carbon/layout with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/README.md

Use Yarn to install the @carbon/layout package as a dependency. Run this command in your project directory.

```bash
yarn add @carbon/layout
```

--------------------------------

### Run migration script with node

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-build-helpers/src/metadata/migrations/README.md

Run a migration script from the command line using Node.js. The example shows the command to execute a specific migration file from the packages/icons directory.

```bash
# From packages/icons
node ../icons-build-helpers/src/metadata/migrations/2020-01-27.js
```

--------------------------------

### HTML example for new block naming

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Example showing a nested element with a new block name, illustrating the preferred approach for independent styles.

```html
<div class="cds--component">
  <button class="cds--component-button">Button</button>
</div>
```

--------------------------------

### Install @carbon/upgrade with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Installs the @carbon/upgrade package as a dependency using npm.

```bash
npm install -S @carbon/upgrade
```

--------------------------------

### Example transform file structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/transforms/ARCHITECTURE.md

This structure shows the required files for adding a new transform named 'sort-prop-types'. Test fixtures use .input.js and .output.js conventions.

```text
- codemods
  - transforms
    - __testfixtures__
      - sort-prop-types.input.js
      - sort-prop-types.output.js
    - __tests__
      - sort-prop-types-test.js
    - sort-prop-types.js
```

--------------------------------

### Install @carbon/layout with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/README.md

Use npm to install the @carbon/layout package as a dependency. Run this command in your project directory.

```bash
npm install -S @carbon/layout
```

--------------------------------

### Project structure tree

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/example/README.md

Shows the directory layout of the CreateTearsheet example, including components, styles, assets, and entry files.

```text
/example
  /components        ← Pattern implementation (private, not exported)
    CreateTearsheet.tsx
    CreateTearsheetStep.tsx
    CreateTearsheetDivider.tsx
  /styles
    _create-tearsheet.scss
  /assets
    create_tearsheet_anatomy.jpg
  index.html
  main.tsx
  App.tsx
  package.json
  README.md
```

--------------------------------

### Tabs v11 usage

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v11 Tabs API with TabList, Tab, TabPanels, and TabPanel components. This is the after-migration example.

```jsx
<Tabs>
  <TabList>
    <Tab>Tab Label 1</Tab>
    <Tab>Tab Label 2</Tab>
    <Tab disabled>Tab Label 3</Tab>
    <Tab title="Tab Label 4 shows truncation">Tab Label 4 shows truncation</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Content for first tab goes here.</TabPanel>
    <TabPanel>Content for second tab goes here.</TabPanel>
    <TabPanel>Content for third tab goes here.</TabPanel>
    <TabPanel>Content for fourth tab goes here.</TabPanel>
  </TabPanels>
</Tabs>
```

--------------------------------

### Listen for cds-use-layer event

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/layer/layer.mdx

Example of listening for the cds-use-layer custom event to get the current layer and level. The event detail contains the layer element and level, and the code updates the text of a specific element with the current layer level.

```javascript
document.addEventListener(`cds-use-layer`, (e) => {
  const { layer, level } = (e as any).detail;
  layer.querySelector('.example-layer-test-component.use-layer').innerText =
    `The current layer level is: ${level + 1}`;
});
```

--------------------------------

### Tabs v10 usage

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v10 Tabs API with Tab components containing content and label props. This is the before-migration example.

```jsx
<Tabs>
  <Tab label="Tab label 1">
    <p>Content for first tab goes here.</p>
  </Tab>
  <Tab label="Tab label 2">
    <p>Content for second tab goes here.</p>
  </Tab>
  <Tab label="Tab label 3" disabled>
    <p>Content for third tab goes here.</p>
  </Tab>
  <Tab
    label="Tab label 4 shows truncation"
    title="Tab label 4 shows truncation">
    <p>Content for fourth tab goes here.</p>
  </Tab>
</Tabs>
```

--------------------------------

### Install @carbon/colors with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Use this command to install the package as a dependency via npm.

```bash
npm install -S @carbon/colors
```

--------------------------------

### Install @carbon/pictograms with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/pictograms/README.md

Install the @carbon/pictograms package using Yarn. Use this command if you prefer Yarn over npm.

```bash
yarn add @carbon/pictograms
```

--------------------------------

### Install @carbon/motion with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/motion/README.md

Use npm to install the @carbon/motion package as a dependency.

```bash
npm install -S @carbon/motion
```

--------------------------------

### Install dependencies with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run this command in the terminal to install all dependencies for every package in the monorepo. Requires Yarn to be installed.

```bash
yarn install
```

--------------------------------

### Configuring PageHeader.BreadcrumbBar with Actions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Example demonstrating how to configure PageHeader.BreadcrumbBar with custom icons, content actions, and page actions.

```jsx
import { Bee, Activity } from '@carbon/icons-react';

const BeeIcon = () => <Bee size={16} />;

const pageActions = (
  <Button
    renderIcon={Activity}
    iconDescription="Icon Description 1"
    hasIconOnly
    size="md"
    kind="ghost"
  />
);

const contentActions = <Button size="md">Button</Button>;

return (
  <PageHeader.Root>
    <PageHeader.BreadcrumbBar
      renderIcon={BeeIcon}
      contentActions={contentActions}
      pageActions={pageActions}>
      <Breadcrumb>
        <BreadcrumbItem href="/#">Breadcrumb 1</BreadcrumbItem>
        <BreadcrumbItem href="#">Breadcrumb 2</BreadcrumbItem>
        <PageHeader.TitleBreadcrumb>Title</PageHeader.TitleBreadcrumb>
      </Breadcrumb>
    </PageHeader.BreadcrumbBar>
    ...
  </PageHeader.Root>
);
```

--------------------------------

### Install jest-config-carbon with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/config/jest-config-carbon/README.md

Install jest-config-carbon using Yarn as an alternative to npm.

```bash
yarn add jest-config-carbon
```

--------------------------------

### Set tooltip alignment on cds-button

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Use the tooltip-alignment attribute on cds-button to position the tooltip text and caret relative to the button. Accepted values are start, center, and end; the default is center. The example shows three buttons with start, default (center), and end alignments.

```html
<cds-button tooltip-text="Add to selection" tooltip-alignment="start">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
<cds-button tooltip-text="Add to selection">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
<cds-button tooltip-text="Add to selection" tooltip-alignment="end">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
```

--------------------------------

### Manual update for icon refs after codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

When a prop passes an icon and places a ref on it, the codemod may not handle it correctly. The example shows the before and after of the codemod transform, requiring manual review.

```jsx
function MyComponent({ renderIcon: Icon }) {
  const ref = useRef(null);
  return <Icon ref={ref} />;
}

// Before
<MyComponent renderIcon={Search16} />

// After the codemod
<MyComponent renderIcon={props => <Search size={16} {...props} />} />
```

--------------------------------

### Install @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Install the React components package for the Carbon Design System.

```bash
npm install @carbon/react
```

--------------------------------

### Use component tokens with @use in SCSS

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

To use component-specific tokens (e.g., button) in v11, you must @use the component's stylesheet. This example shows how to reference the $button-primary token.

```scss
@use '@carbon/styles/scss/components/button';

.my-selector {
  background: button.$button-primary;
}
```

--------------------------------

### Install @carbon/motion with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/motion/README.md

Use Yarn to install the @carbon/motion package as a dependency.

```bash
yarn add @carbon/motion
```

--------------------------------

### Basic MultiSelect implementation

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Example of creating a MultiSelect component with initial selected items.

```jsx
<MultiSelect
  useTitleInItem={false}
  label="MultiSelect Label"
  invalid={false}
  invalidText="Invalid Selection"
  onChange={onChange}
  items={[
    { id: 'item-1', text: 'Item 1' },
    { id: 'item-2', text: 'Item 2' },
  ]}
  itemToString={itemToString}
  initialSelectedItems={[
    { id: 'item-1', text: 'Item 1' },
    { id: 'item-2', text: 'Item 2' },
  ]}
  translateWithId={translateWithId}
/>
```

--------------------------------

### Offset column with span and start at breakpoints

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/grid/grid.mdx

Use the object form for breakpoint props to specify column span and offset. The example sets the column to span 2 columns at the small breakpoint, then 4 columns at the medium breakpoint with an offset of 2 columns.

```html
<cds-column sm="2" md="span:4 start:2"></cds-column>
```

--------------------------------

### Install eslint-config-carbon with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/config/eslint-config-carbon/README.md

Use this command to install the package as a dependency using Yarn.

```bash
yarn add eslint-config-carbon
```

--------------------------------

### Install react-keyed-flatten-children

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/docs/UsingFragmentsWithSwitcher.md

Install the react-keyed-flatten-children package via npm to flatten arrays and React Fragments into a one-dimensional array.

```bash
npm install react-keyed-flatten-children

```

--------------------------------

### enable-v12-tile-default-icons codemod example (before/after)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the transformation applied by the enable-v12-tile-default-icons codemod: wrapping Tile components with <FeatureFlags enableV12TileDefaultIcons> and adding the necessary import.

```jsx
// Before
import { Tile } from '@carbon/react';

<Tile>Content</Tile>;

// After
import { Tile } from '@carbon/react';
import { FeatureFlags } from '@carbon/feature-flags';

<FeatureFlags enableV12TileDefaultIcons>
  <Tile>Content</Tile>
</FeatureFlags>;
```

--------------------------------

### Unstable/preview Pagination to stable Pagination migration example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after of migrating from `unstable_Pagination` / `preview_Pagination` to the stable `Pagination` component. The `PageSelector` import and render-prop children are removed. Custom page-select children are removed and a `TODO` comment is left for migration with `renderPageSelect` if needed. Omit `pageSizes` to hide the items per page selector.

```jsx
// Before
import {
  unstable_Pagination as Pagination,
  unstable_PageSelector as PageSelector,
} from '@carbon/react';

<Pagination pageSizes={[10, 20, 30]} totalItems={100}>
  {({ currentPage, onSetPage, totalPages }) => (
    <PageSelector
      currentPage={currentPage}
      onChange={(event) => onSetPage(event.target.value)}
      totalPages={totalPages}
    />
  )}
</Pagination>;

// After
import { Pagination } from '@carbon/react';

<Pagination pageSizes={[10, 20, 30]} totalItems={100} />;
```

--------------------------------

### Import Carbon React components for delete/remove patterns

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/DeleteAndRemove/DeleteAndRemove.mdx

Imports the Carbon React components recommended for building delete and remove patterns: Button, Checkbox, FormLabel, InlineLoading, Link, Modal, TextInput, and ToastNotification. Use this as the starting point for implementing the pattern examples.

```jsx
import {
  Button,
  Checkbox,
  FormLabel,
  InlineLoading,
  Link,
  Modal,
  TextInput,
  ToastNotification,
} from '@carbon/react';
```

--------------------------------

### Install jest-config-carbon with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/config/jest-config-carbon/README.md

Install jest-config-carbon using npm. Use the -S flag to save it as a dependency.

```bash
npm install -S jest-config-carbon
```

--------------------------------

### Install eslint-config-carbon with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/config/eslint-config-carbon/README.md

Use this command to install the package as a dependency using npm.

```bash
npm install -S eslint-config-carbon
```

--------------------------------

### Use @carbon/themes entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/docs/sass.md

Import the package entrypoint and use theme tokens, emit CSS custom properties, and retrieve token values.

```scss
@use '@carbon/themes';

.my-component {
  // Use tokens from the theme, this will map to a CSS Custom Property
  color: themes.$token-01;
}

:root {
  // Emit CSS Custom Properties for the current theme
  @include themes.theme();
}

// Get the value of a specific token
$custom-variable: rgba(themes.get('token-01'), 0.25);
```

--------------------------------

### Mirror default entrypoint configuration

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Manually include only necessary modules and components to reduce CSS output. Ensure configuration modules are loaded first and the main styles module is loaded last.

```scss
// Use the config module to set config variables
@use '@carbon/styles/scss/config' with (
  $prefix: 'cds'
);

// Include prerequisite modules typically provided through the main entrypoint
@use '@carbon/styles/scss/reset';
@use '@carbon/styles/scss/grid';
@use '@carbon/styles/scss/layer';
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme';

// Optionally include components that you need
@use '@carbon/styles/scss/components/button';
```

--------------------------------

### Example entry in `meta.json` for an icon

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/icons.md

Shows the structure of an entry in the `meta.json` file from `@carbon/icons`. Each entry includes the source filename, basename, optional size, prefix directories, an icon descriptor tree, a JavaScript-safe module name, and output options. Use this metadata to generate component icon libraries.

```json5
{
  // The source filename
  filename: 'add--outline.svg',
  basename: 'add--outline',

  // Optional size attribute if under a `16` directory
  size: 16,

  // Prefix represents each directory in the path to the source file.
  // Useful for output paths in the icon library
  prefix: [
    // Means that the icon is available at `/16/add--outline.svg`
    '16',
  ],

  // An icon "descriptor" which represents all the information about the icon
  // syntax tree in an object. Each level has `elem`, `attrs`, and `content`.
  descriptor: {
    elem: 'svg',
    attrs: {
      '...': '...',
    },
    content: [
      {
        elem: 'path',
        attrs: {
          d: '...',
        },
      },
    ],
  },

  // JavaScript-safe module name for the icon. Used to stay consistent across
  // libraries
  moduleName: 'AddOutline16',

  // Represents the output options of the file in `@carbon/icons`. Useful for
  // mirroring the output path in each icon library
  outputOptions: {
    file: 'es/add--outline/16.js',
  },
}
```

--------------------------------

### SassDoc examples for variable, mixin, and function

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Examples showing how to annotate a variable, mixin, and function with SassDoc, including required annotations like @type, @param, @return, @access, and @group.

```scss
// Variable example

/// Primary interactive color; Primary buttons
/// @type Color
/// @access public
/// @group @carbon/themes
$interactive-01: map-get($carbon--theme, interactive-01) !default;

// Mixin example

/// Create the container for a grid. Will cause full-bleed for the grid unless
/// max-width properties are added with `make-container-max-widths`
/// @param {Map} $breakpoints [$carbon--grid-breakpoints] - A map of breakpoints where the key is the name
/// @access private
/// @group @carbon/grid
@mixin carbon--make-container($breakpoints: $carbon--grid-breakpoints) {
}

// Function example

/// Compute the type size for the given type scale step
/// @param {Number} $step - Type scale step
/// @return {Number} In px
/// @access public
/// @group @carbon/type
@function carbon--get-type-size($step) {
}
```

--------------------------------

### Install Carbon v11 beta packages with npm or Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/release-partners.md

Install the latest beta versions of carbon-components and carbon-components-react using npm or Yarn. These versions are required to preview Carbon v11 functionality.

```bash
npm i carbon-components@^10.35.0 carbon-components-react@^7.35.0
```

```bash
yarn add carbon-components@^10.35.0 carbon-components-react@^7.35.0
```

--------------------------------

### Install carbon-components-react with npm

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/carbon-components-react/README.md

Install carbon-components-react using npm. This package is deprecated and will not receive any more updates.

```bash
npm install -S carbon-components-react
```

--------------------------------

### Date picker with value attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/date-picker.mdx

By default the date picker sets the current date as its value. To start at a different date, pass a date string or date object via the `value` attribute on `cds-date-picker-input`. The example uses `value="04/17/2025"`.

```html
<cds-date-picker>
  <cds-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"
    value="04/17/2025"></cds-date-picker-input>
</cds-date-picker>
```

--------------------------------

### Approach 2 - Preview-first migration import path evolution

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0009-ibm-products-to-core-migration.md

Shows the import path changes for the rejected preview-first approach: moving the component as a preview candidate at v12, then landing the composable version as preview, and eventually promoting to stable while deprecating the preview candidate.

```plaintext
v11:             import { SidePanel } from '@carbon/ibm-products';
v12:             import { previewCandidate__SidePanel } from '@carbon/react';
post-v12:        import { preview__SidePanel } from '@carbon/react';   // e.g. preview__SidePanel.Header, ...Body
stabilization:   import { SidePanel } from '@carbon/react';            // composable promoted; preview candidate deprecated
```

--------------------------------

### Install Dart Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Install Dart Sass if you compile Carbon styles in your application.

```bash
npm install sass
```

--------------------------------

### Custom imports for PageHeader example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Imports required for the PageHeader example, including Button from @carbon/react and icons from @carbon/react/icons.

```javascript
import { Button } from '@carbon/react';
```

```javascript
import { Add, Bee, CloudFoundry_1, AiGenerate, Activity } from '@carbon/react/icons';
```

--------------------------------

### Check Node.js version

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/code-snippet/cdn.html

Checks the installed Node.js version, a prerequisite for using the component.

```bash
node -v
```

--------------------------------

### Compact icon indicator example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon-indicator/icon-indicator.mdx

Use this example to render an icon indicator in compact mode, which shows only the icon with the label in a tooltip on hover/focus. The `compact` attribute is set to `true` by including it without a value.

```html
<cds-icon-indicator
  kind="succeeded"
  label="Succeeded"
  compact></cds-icon-indicator>
```

--------------------------------

### Install carbon-components-react with Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/carbon-components-react/README.md

Install carbon-components-react using Yarn as an alternative to npm. This package is deprecated and will not receive any more updates.

```bash
yarn add carbon-components-react
```

--------------------------------

### User-avatar with image

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/user-avatar/user-avatar.mdx

Example with a profile picture. Pass a full image URL to the `image` attribute and a description to `image-description` for screen readers.

```html
<cds-user-avatar
  tooltip-alignment="right"
  tooltip-text="TW, Thomas J. Watson user profile"
  size="md"
  image="https://example.com/avatar.png"
  image-description="Avatar of Thomas J. Watson">
</cds-user-avatar>
```

--------------------------------

### Run enable-v12-release migration

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Runs the enable-v12-release codemod with the --write flag to apply changes to the project.

```bash
npx @carbon/upgrade migrate enable-v12-release --write
```

--------------------------------

### @carbon/upgrade CLI help output

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the full command-line help for @carbon/upgrade, including available commands and options.

```bash
Usage: @carbon/upgrade [options]

Commands:
  @carbon/upgrade upgrade                   upgrade your project       [default]
  @carbon/upgrade migrate <migration>       run a Carbon migration on your
  [paths...]                                source files
  @carbon/upgrade migrate list              list all available migrations

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
      --force    force execution if the cli encounters an error while doing
                 safety checks                        [boolean] [default: false]
  -w, --write    update the files with changes found by running the migration
                                                      [boolean] [default: false]
  -v, --verbose  optionally include additional logs, useful for debugging
                                                      [boolean] [default: false]
      --decoratorsBeforeExport  parse decorators before export declarations
                                                      [boolean] [default: false]
```

--------------------------------

### Install prettier-config-carbon with npm or Yarn

Source: https://github.com/carbon-design-system/carbon/blob/main/config/prettier-config-carbon/README.md

Install prettier-config-carbon using either npm or Yarn. The npm command uses the -S flag to save the package as a dependency.

```bash
npm install -S prettier-config-carbon
```

```bash
yarn add prettier-config-carbon
```

--------------------------------

### Run @carbon/upgrade with npx

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Runs the @carbon/upgrade CLI directly using npx without installing it locally.

```bash
npx @carbon/upgrade
```

--------------------------------

### AILabel aiTextLabel prop examples

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/AILabel/AILabel.mdx

Shows two examples of the inline variant with and without the aiTextLabel prop to add adjacent text.

```jsx
<AILabel kind="inline" textLabel="Text goes here">
  <AILabelContent>Explanation of AI generated content</AILabelContent>
</AILabel>

<AILabel kind="inline">
  <AILabelContent>Explanation of AI generated content</AILabelContent>
</AILabel>
```

--------------------------------

### Import the 16x16 add icon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons/README.md

Example of importing the add icon at 16x16 size using ES2015 modules (es).

```js
import AddIcon from '@carbon/icons/es/add/16';
```

--------------------------------

### Register new output file in sd.config.js

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/tokens/README.md

Register the new output file in `style-dictionary/sd.config.js` under the `scss` platform's `files` array. This example adds a destination `_gap.scss` with the format `carbon/scss-gap`.

```javascript
{ destination: '_gap.scss', format: 'carbon/scss-gap' }
```

--------------------------------

### Basic Tearsheet Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

A complete basic tearsheet with header, body, and footer, including text input, textarea, and action buttons.

```html
<cds-tearsheet open>
  <cds-tearsheet-header slot="header">
    <cds-tearsheet-header-content slot="header-content" title="Create resource">
      <div slot="description">description</div>
    </cds-tearsheet-header-content>
  </cds-tearsheet-header>

  <cds-tearsheet-body slot="body">
    <div slot="main-content">
      <cds-text-input label="Resource name"></cds-text-input>
      <cds-textarea label="Description"></cds-textarea>
    </div>
  </cds-tearsheet-body>

  <cds-tearsheet-footer slot="footer">
    <cds-button kind="secondary">Cancel</cds-button>
    <cds-button kind="primary">Create</cds-button>
  </cds-tearsheet-footer>
</cds-tearsheet>
```

--------------------------------

### InterstitialScreen HTML example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/interstitial-screen/interstitial-screen.mdx

Example markup for the InterstitialScreen component, including header, body, and footer subcomponents. The example uses template literals for dynamic content and event handlers.

```html
<cds-interstitial-screen
  ?fullscreen="${false}"
  ?open="${true}"
  @cds-interstitial-opened="${(e) => { console.log('event initialize', e.detail); }}">
  <cds-interstitial-screen-header
    header-title="Use case-specific title"
    header-subtitle="Use case-specific sub title"></cds-interstitial-screen-header>
  <cds-interstitial-screen-body>
    <cds-interstitial-screen-body-item
      id="${eachContent.id}"
      stepTitle="${eachContent.stepTitle}">
      <div
        role="complementary"
        aria-label="${eachContent.stepTitle}"
        class="cds--interstitial-screen-view">
        <section class="${blockClass}">
          <h1 class="${blockClass}--heading">${eachContent.title}</h1>
          <p class="${blockClass}--body">${eachContent.description}</p>
        </section>
      </div>
    </cds-interstitial-screen-body-item>
  </cds-interstitial-screen-body>
  <cds-interstitial-screen-footer
    @cds-on-action="${onAction}"></cds-interstitial-screen-footer>
</cds-interstitial-screen>
```

--------------------------------

### Basic cds-layer nesting example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/layer/layer.mdx

Shows how to nest cds-layer components to apply layer tokens to child elements. Layers can be nested indefinitely, but token sets typically end after 3 layers.

```html
<cds-layer>
  <div>Test component</div>
  <cds-layer>
    <div>Test component</div>
    <cds-layer>
      <div>Test component</div>
    </cds-layer>
  </cds-layer>
</cds-layer>
```

--------------------------------

### Import CoachmarkOverlayElements dependencies (JS)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/coachmark/coachmark-overlay-elements/coachmark-overlay-elements.mdx

Imports required modules for the CoachmarkOverlayElements pattern: popover alignment definitions, coachmark and beacon components, carousel utilities, and button component. Use these imports before using the HTML example.

```javascript
import { POPOVER_ALIGNMENT } from '@carbon/web-components/es/components/popover/defs.js';
import '@carbon/ibm-products-web-components/es/components/coachmark/index.js';
import '@carbon/ibm-products-web-components/es/components/coachmark/coachmark-beacon/index.js';
import { InitCarousel, initCarousel } from '@carbon/utilities';
import '@carbon/web-components/es/components/button/button.js';
```

--------------------------------

### Run v12 Storybook for Web Components

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/working-with-v12.md

Starts the v12 Storybook for the Web Components package on port :6012. Run from the packages/web-components directory.

```sh
cd packages/web-components
yarn storybook:v12
```

--------------------------------

### Run the enable-v12-overflowmenu codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/feature-flags.md

Example of running the enable-v12-overflowmenu codemod to enable the v12 OverflowMenu feature flag. Use this in your project directory with a clear working directory.

```bash
npx @carbon/upgrade migrate enable-v12-overflowmenu --write
```

--------------------------------

### Configure Vite with vite.config.js

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Create a vite.config.js file with the scss preprocessor options to set includePaths for Vite.

```js
export default {
  css: {
    preprocessorOptions: {
      scss: {
        includePaths: ['node_modules'],
      },
    },
  },
};
```

--------------------------------

### Bounded programmatic resize with container constraints

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Extends the single panel example by constraining the panel height between 48px and container height minus 20px. Uses resize-start and resize-drag events with e.detail.delta.

```html
<div class="container" style="height: 400px">
  <div class="panel" id="boundedPanel">Panel content</div>
  <cds-resizer-handle></cds-resizer-handle>
</div>

<script>
  const handle = document.querySelector('cds-resizer-handle');
  const panel = document.getElementById('boundedPanel');
  const container = document.querySelector('.container');
  let initialHeight = 0;

  handle.addEventListener('resize-start', () => {
    initialHeight = panel.offsetHeight;
  });

  handle.addEventListener('resize-drag', (e) => {
    const newHeight = initialHeight + e.detail.delta;
    const constrainedHeight = Math.max(
      48,
      Math.min(newHeight, container.offsetHeight - 20)
    );
    panel.style.height = `${constrainedHeight}px`;
  });
</script>
```

--------------------------------

### Example icon metadata entry in metadata.yml

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/icons.md

Shows the YAML structure for an icon entry, including name, friendly_name, usage, categories, aliases, sizes, and variants. Use this as a reference when editing aliases for an icon.

```yaml
icons:
  - name: add
    friendly_name: Add
    usage: This is a description for usage
    categories:
      - Navigation
    aliases:
      - add
      - plus
      - cross
      - create
    sizes:
      - 16
      - 32
    variants:
      - name: add--alt
        usage: This is a description for usage
        sizes:
          - 16
          - 32
      - name: add--filled
        usage: This is a description for usage
        sizes:
          - 16
```

--------------------------------

### Implementing PageHeader.HeroImage with Grid and Column

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

This example demonstrates how to structure a PageHeader with a hero image using Grid and Column components. The PageHeader.HeroImage component supports an objectFit prop to control image scaling behavior.

```jsx
import { Grid, Column } from '@carbon/react';

return (
  <PageHeader.Root>
    <Grid>
      <Column lg={8} md={4} sm={4}>
        <PageHeader.BreadcrumbBar ... />
        <PageHeader.Content ... />
      </Column>
      <Column lg={8} md={4} sm={0}>
        <PageHeader.HeroImage objectFit="cover">
          <picture>
            <source
              srcset={image1}
              media={`(min-width: ${breakpoints.lg.width})`}
            />
            <source
              srcset={image2}
              media={`(max-width: ${breakpoints.lg.width})`}
            />
            <img
              src={image1}
              alt="a default image"
            />
          </picture>
        </PageHeader.HeroImage>
      </Column>
    </Grid>
  </PageHeader.Root>
)
```

--------------------------------

### Toggletip with actions using slot="actions"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/toggle-tip/toggletip.mdx

Use this example to render a toggletip with actions. The `slot="body-text"` on the paragraph provides the main content, while `slot="actions"` on the link and button places them underneath the content.

```html
<cds-toggletip>
  <p slot="body-text">
    Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed do
    eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
  </p>
  <cds-link href="custom-link" slot="actions">Custom link</cds-link>
  <cds-button size="sm" slot="actions">Custom action</cds-button>
</cds-toggletip>
```

--------------------------------

### Import required components for CoachmarkStacked

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/Coachmark/CoachmarkStacked/CoachmarkStacked.mdx

Imports Button, Theme, Link, Coachmark, CoachmarkTagline, and carousel utilities needed to build the CoachmarkStacked pattern. Use these imports before implementing the stacked coachmark example.

```jsx
import { Button, Theme, Link as CarbonLink } from '@carbon/react';
import {
  preview__CoachmarkTagline as CoachmarkTagline,
  preview__Coachmark as Coachmark,
} from '@carbon/ibm-products';
import { InitCarousel, initCarousel } from '@carbon/utilities';
```

--------------------------------

### @HostListener decorator example in CDSModal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/coding-conventions.md

Example from <cds-modal> code showing use of @HostListener('click') to attach an event listener to the host element, with a comment about TypeScript ignoring the unused method.

```typescript
...
import HostListener from '../../globals/decorators/HostListener';
import HostListenerMixin from '../../globals/mixins/HostListener';
...

@customElement(`${prefix}-modal` as any)
class CDSModal extends HostListenerMixin(LitElement) {
  ...

  @HostListener('click')
  // @ts-ignore: The decorator refers to this method but TS thinks this method is not referred to
  private _handleClick = (event: MouseEvent) => {
    ...
  };

  ...
}
```

--------------------------------

### Date picker value attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Pass a value string to the input to initialize the selected date. The example initializes the date to 04/17/2025.

```html
<cds-preview-date-picker>
  <cds-preview-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"
    value="04/17/2025"></cds-preview-date-picker-input>
</cds-preview-date-picker>
```

--------------------------------

### SidePanel HTML example with resizable and slots

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/side-panel/side-panel.mdx

Example usage of the cds-side-panel element with attributes like include-overlay, open, label-text, size, title, and resizable. Demonstrates optional slots for subtitle, action-toolbar, and actions.

```html
<cds-side-panel
  include-overlay
  open
  label-text="An optional label"
  size="md"
  title="A title, can be omitted"
  resizable>
  <!-- Content -->
  <h5>Side panel content</h5>
  <div class="${storyPrefix}text-inputs">
    <cds-text-input
      label="Input A"
      id="side-panel-story-text-input-a"></cds-text-input>
    <cds-text-input
      label="Input B"
      id="side-panel-story-text-input-b"></cds-text-input>
  </div>
  <div class="${storyPrefix}text-inputs">
    <cds-text-input
      label="Input C"
      id="side-panel-story-text-input-c"></cds-text-input>
    <cds-text-input
      label="Input D"
      id="side-panel-story-text-input-d"></cds-text-input>
  </div>
  <div class="${storyPrefix}textarea-container">
    <cds-textarea label="Notes" value="This is a text area"></cds-textarea>
    <cds-textarea label="Notes" value="This is a text area"></cds-textarea>
    <cds-textarea label="Notes" value="This is a text area"></cds-textarea>
  </div>

  <!-- subtitle optional -->
  <div slot="subtitle">
    Subtitle text which can provide more detail on the content being displayed.
  </div>

  <!-- Action toolbar optional -->
  <cds-button slot="action-toolbar">Copy</cds-button>
  <cds-button
    slot="action-toolbar"
    aria-label="Settings"
    has-icon-only="true"
    kind="${BUTTON_KIND.GHOST}"
    size="sm"
    tooltip-text="Settings">
    ${Settings({ slot: 'icon' })}
  </cds-button>
  <cds-button
    slot="action-toolbar"
    aria-label="Delete"
    has-icon-only="true"
    kind="${BUTTON_KIND.GHOST}"
    size="sm"
    tooltip-text="Delete">
    ${Trashcan({ slot: 'icon' })}
  </cds-button>

  <!-- Side panel actions optional -->
  <cds-button slot="actions" kind="${BUTTON_KIND.GHOST}">Ghost</cds-button>
  <cds-button slot="actions" kind="${BUTTON_KIND.PRIMARY}"></cds-button>
</cds-side-panel>
```

--------------------------------

### Select with form item and option groups

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/select/select.mdx

Example of a select wrapped in cds-form-item with option groups and placeholder.

```html
<cds-form-item>
  <cds-select
    id="id_for_label"
    helper-text="Optional helper text"
    label-text="Select"
    placeholder="Optional placeholder text">
    <cds-select-item-group label="Category 1">
      <cds-select-item value="all">Option 1</cds-select-item>
      <cds-select-item value="cloudFoundry">Option 2</cds-select-item>
    </cds-select-item-group>
    <cds-select-item-group label="Category 2">
      <cds-select-item value="staging">Option 3</cds-select-item>
      <cds-select-item value="dea">Option 4</cds-select-item>
      <cds-select-item value="router">Option 5</cds-select-item>
    </cds-select-item-group>
  </cds-select>
</cds-form-item>
```

--------------------------------

### Example path to IBM Plex Sans woff2 file

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Shows how to locate a specific font file within the `@ibm/plex` package. The path includes the font family, output type, format, and file name.

```text
<path-to-node-modules>/@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2
```

--------------------------------

### Import from root entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities-react/README.md

Imports a utility from the package root entrypoint.

```js
import { utility } from '@carbon/utilities-react';
```

--------------------------------

### Use theme variables from themes entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Imports the themes entrypoint and shows available theme variables.

```scss
@use '@carbon/styles/scss/themes';

// themes.$white
// themes.$g10
// themes.$g90
// themes.$g100
```

--------------------------------

### Selectable Tag Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tag/tag.mdx

Sample code for creating selectable tags using the cds-selectable-tag component. It maps over a tags array to render the tags, and adds an event listener for the 'cds-selectable-tag-selected' event to log the detail. The example includes a disabled attribute and an icon slot.

```javascript
const tags = [
  {
    text: 'Tag content with a long text description',
  },
  {
    text: 'Tag content 1',
  },
  {
    text: 'Tag content 2',
  },
  {
    text: 'Tag content 3',
  },
];

function App() {
  return html`
    <div aria-label="Selectable tags" role="group">
      ${tags.map(
        (tag) =>
          html`<cds-selectable-tag
            ?disabled="${disabled}"
            ?selected="${tag.selected}"
            id="${tag.id}"
            text="${text || tag.text}"
            size="${size}"
            >${iconLoader(Asleep16, { slot: 'icon' })}
          </cds-selectable-tag>`
      )}
    </div>
  `;
}

const tags = document.querySelectorAll('cds-selectable-tag');

tags.forEach((tag) =>
  tag.addEventListener('cds-selectable-tag-selected', (e) => {
    console.log(e.detail);
  })
);
```

--------------------------------

### Run v12 Storybook for React

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/working-with-v12.md

Starts the v12 Storybook for the React package on port :3012. Run from the packages/react directory.

```sh
cd packages/react
yarn storybook:v12
```

--------------------------------

### Legacy Tearsheet Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

Before migration: the legacy tearsheet uses a single `cds-tearsheet` element with `label` and `description` attributes.

```html
<cds-tearsheet open label="Create resource" description="Configure settings">
  <div>Content</div>
</cds-tearsheet>
```

--------------------------------

### Next Gen Tearsheet Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

After migration: the next-gen tearsheet uses subcomponents `cds-tearsheet-header`, `cds-tearsheet-header-content`, and `cds-tearsheet-body` with named slots.

```html
<cds-tearsheet open>
  <cds-tearsheet-header slot="header">
    <cds-tearsheet-header-content slot="header-content" title="Create resource">
      <div slot="description">Configure settings</div>
    </cds-tearsheet-header-content>
  </cds-tearsheet-header>

  <cds-tearsheet-body slot="body">
    <div slot="main-content">Content</div>
  </cds-tearsheet-body>
</cds-tearsheet>
```

--------------------------------

### Implement Modal State Manager

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.mdx

Example of using React state and a button to toggle the open prop of a ComposedModal, utilizing a React portal for top-level rendering.

```jsx
function ModalStateManager() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {typeof document === 'undefined'
        ? null
        : ReactDOM.createPortal(
            <ComposedModal open={open} onClose={() => setOpen(false)}>
              ...
            </ComposedModal>,
            document.body
          )}
      <Button kind="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
    </>
  );
}
```

--------------------------------

### IBM Plex loading configuration options

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Shows three configuration options for loading IBM Plex: default monolithic, per-family (recommended), and Akamai CDN. Also demonstrates setting a custom font path with per-family loading.

```scss
// Option 1: Use legacy monolithing `@ibm/plex` assets
// No configuration is needed, this is the default

// Option 2: Use per-family loading (recommended)
@use '@carbon/react' with (
  $use-per-family-plex: true
);

// Option 3: Use Akamai CDN
@use '@carbon/react' with (
  $use-akamai-cdn: true
);

// When using option 1 or 2, optionally provide a custom font path.
// This can be used with the default `@ibm/plex` configuration, or
// with $use-per-family-plex.
@use '@carbon/react' with (
  $use-per-family-plex: true
);
$font-path: 'path/to/fonts';
```

--------------------------------

### DatePicker locale prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Uses the locale prop for internationalization, combined with dateFormat. The example loads Norwegian text with the proper date format.

```jsx
// Load Norwegian text with the proper date format
<DatePicker locale="no" dateFormat="d/m/Y" datePickerType="single">
  <DatePickerInput placeholder="dd/mm/yyyy" />
</DatePicker>
```

--------------------------------

### Preview date picker markup

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/MIGRATION.md

Example markup for the preview date picker component. Uses the new tags and a basic date format with numeric tokens.

```html
<cds-preview-date-picker date-format="m/d/Y">
  <cds-preview-date-picker-input
    kind="single"
    label-text="Date Picker label"
    placeholder="mm/dd/yyyy">
  </cds-preview-date-picker-input>
</cds-preview-date-picker>
```

--------------------------------

### JavaScript imports for CoachmarkFixed example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/coachmark/coachmark-fixed/coachmark-fixed.mdx

Import the necessary modules for the CoachmarkFixed pattern: popover alignment, coachmark, coachmark-tagline, button, carousel utility, and link components.

```javascript
import { POPOVER_ALIGNMENT } from '@carbon/web-components/es/components/popover/defs.js';
import '@carbon/ibm-products-web-components/es/components/coachmark/index.js';
import '@carbon/ibm-products-web-components/es/components/coachmark/coachmark-tagline/index.js';
import '@carbon/web-components/es/components/button/button.js';
import { InitCarousel, initCarousel } from '@carbon/utilities';
import '@carbon/web-components/es/components/link/index.js';
```

--------------------------------

### Example 4-column CSS grid HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows how to structure a 4-column grid using the default prefix (cds--) with the css-grid and col-span-4 classes.

```html
<div class="cds--css-grid">
  <div class="cds--col-span-4"></div>
  <div class="cds--col-span-4"></div>
  <div class="cds--col-span-4"></div>
  <div class="cds--col-span-4"></div>
</div>
```

--------------------------------

### NotificationPanel HTML example with slots

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/notification-panel/notification-panel.mdx

Example usage of the NotificationPanel component with today, previous, and footer slots. The component is opened by default and includes attributes for text labels and locale.

```html
<cds-notification-panel
  title-text="Notifications"
  today-text="Today"
  previous-text="Previous"
  dismiss-all-label="Dismiss all"
  empty-state-label="You do not have any notifications"
  donot-disturb-label="Do not disturb"
  date-time-locale="en-US"
  open>
  <!-- Today notifications (slot="today") -->
  <cds-notification slot="today" type="error" unread>
    <span slot="title">Notification title</span>
    <span slot="description">Notification description text.</span>
  </cds-notification>

  <!-- Previous notifications (slot="previous") -->
  <cds-notification slot="previous" type="informational">
    <span slot="title">Notification title</span>
    <span slot="description">Notification description text.</span>
  </cds-notification>

  <!-- Footer (slot="footer") -->
  <cds-notification-footer
    slot="footer"
    view-all-label="View all"></cds-notification-footer>
</cds-notification-panel>
```

--------------------------------

### Import Carbon helpers

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Include specific helpers like the CSS reset or grid system.

```scss
// Bring in the CSS Reset
@use '@carbon/styles/scss/reset';

// Bring in the CSS Grid
@use '@carbon/styles/scss/grid';
```

--------------------------------

### Collation: example of ordering list items in DOM

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/coding-conventions.md

Shows the recommended way to determine order in a list item by ordering them in the DOM, as used in <cds-dropdown>.

```html
<cds-dropdown>
  <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
  <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
  <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
</cds-dropdown>
```

--------------------------------

### Run enable-v12-tile-default-icons migration

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Runs the enable-v12-tile-default-icons codemod with the --write flag to enable default Tile icons.

```bash
npx @carbon/upgrade migrate enable-v12-tile-default-icons --write
```

--------------------------------

### Dropdown itemToString prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

Use itemToString to extract the text from object items for display. The example shows combining itemToString with itemToElement.

```jsx
<Dropdown
  items={[
    { id: 'option-0', text: 'Option 0' },
    { id: 'option-1', text: 'Option 1' },
    { id: 'option-2', text: 'Option 2' },
  ]}
  itemToString={(item) => (item ? item.text : '')}
  itemToElement={(item) =>
    item ? (
      <span className="test" style={{ color: 'red' }}>
        {item.text} 🔥
      </span>
    ) : (
      ''
    )
  }
  label="Select an option..."
  id="item-to-element"
  titleText="Label"
/>
```

--------------------------------

### Reset dependencies and re-generate install state

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Use these commands to fix CI failures during `yarn install` caused by lockfile drift or stale local dependency state. They reset local dependencies and re-generate install state from the lockfile.

```bash
yarn clean
yarn cache clean
yarn
```

--------------------------------

### Example of hooks that accept a ref as an argument

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows the preferred pattern where hooks take a ref as an argument, allowing the caller to manage the ref and pass it to multiple hooks.

```jsx
function MyComponent() {
  const ref = useRef(null);
  const isHovering = useHover(ref);
  const isDragging = useDrag(ref);

  // Caller has to add `ref` to a node below
}
```

--------------------------------

### Example of a hook that uses a callback

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows a useEvent hook that executes a callback when an event fires, demonstrating the pattern of passing a callback to a hook.

```js
useEvent(window, 'click', (event) => {
  // Called when the click event fires
});
```

--------------------------------

### Button set stacked attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Arranges two button elements vertically inside a cds-button-set by using the stacked attribute. The example shows a secondary button above a primary button.

```html
<cds-button-set stacked>
  <cds-button kind="secondary">Secondary button</cds-button>
  <cds-button kind="primary">Primary button</cds-button>
</cds-button-set>
```

--------------------------------

### FullPageError HTML example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/full-page-error/full-page-error.mdx

Example HTML markup for the FullPageError component with attributes like label, title, description, and kind. Includes placeholder content and links.

```html
<cds-full-page-error
  label="Error 404"
  class="my-custom-class"
  title="Page not found"
  description="The page you requested has moved or is unavailable, or the specified URL is not valid. Please check the URL or search the site for the requested content."
  kind="404">
  <!-- Pass any content you want to display to the user here -->
  <a class="cds--link" href="#">– Forwarding Link 1</a>
  <br />
  <a class="cds--link" href="#">– Forwarding Link 2</a>
</cds-full-page-error>
```

--------------------------------

### Implementing PageHeader.BreadcrumbPageActions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Example showing how to define an array of action items and pass them to the PageHeader.BreadcrumbPageActions component within a PageHeader.BreadcrumbBar.

```jsx
import { Activity, AiGenerate, CloudFoundry_1 } from '@carbon/icons-react';

const breadcrumbPageActionItems = [
  {
    id: 'breadcrumb-action-1',
    label: 'Icon Description 1',
    renderIcon: Activity,
    onClick: () => console.log('Breadcrumb action 1'),
  },
  {
    id: 'breadcrumb-action-2',
    label: 'Icon Description 2',
    renderIcon: AiGenerate,
    onClick: () => console.log('Breadcrumb action 2'),
  },
  {
    id: 'breadcrumb-action-3',
    label: 'Icon Description 3',
    renderIcon: CloudFoundry_1,
    onClick: () => console.log('Breadcrumb action 3'),
  },
];

return (
  <PageHeader.Root>
    <PageHeader.BreadcrumbBar
      pageActions={
        <PageHeader.BreadcrumbPageActions
          actions={breadcrumbPageActionItems}
          buttonSize="md"
          buttonKind="ghost"
          overflowMenuLabel="More page actions"
        />
      }>
      <Breadcrumb>
        <BreadcrumbItem href="/#">Breadcrumb 1</BreadcrumbItem>
        <BreadcrumbItem href="#">Breadcrumb 2</BreadcrumbItem>
      </Breadcrumb>
    </PageHeader.BreadcrumbBar>
    ...
  </PageHeader.Root>
);
```

--------------------------------

### DatePicker light prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Toggles the light variant of the DatePicker to improve contrast on same-colored backgrounds.

```jsx
<DatePicker light>...</DatePicker>
```

--------------------------------

### Coachmark Stacked HTML Structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/coachmark/coachmark-stacked/coachmark-stacked.mdx

HTML markup for the stacked coachmark example, including a parent coachmark with tagline, header, body, and child coachmarks with trigger buttons. Uses Lit templates and event handlers.

```html
    <!-- Parent Coachmark -->
        <c4p-coachmark
          ?open=${this._parentOpen}
          align=${POPOVER_ALIGNMENT.TOP}
          .highContrast=${true}
          .caret=${false}
          @c4p-coachmark-request-close=${this.handleParentClose}
        >
          <c4p-coachmark-tagline
            id="CoachmarkTagline"
            title="Why are there two types of severity scores?"
            close-icon-description="close"
            ?open=${this._parentOpen}
            @c4p-coachmark-tagline-cta-click=${this.handleTaglineClick}
            slot="trigger"
          >
          </c4p-coachmark-tagline>
          <c4p-coachmark-header closeIconDescription="Close"></c4p-coachmark-header>
          <c4p-coachmark-body class="coachmark-stacked-home__body">
            <div class="coachmark-stacked-home-element">
              ${iconLoader(Idea20, { class: 'coachmark-stacked-home__icon-idea' })}
            </div>
            <div class="coachmark-stacked-home__content">
              <h2 class="coachmark-stacked-home__title">Example title</h2>
              <p class="coachmark-stacked-home__body">This is an example of a description</p>
            </div>
            <ul class="coachmark-stacked-home__nav-links">
              ${parentItems.map((item) => html`
                <li key=${item.id}>
                  <cds-button
                    id="parent-button-${item.id}"
                    kind="ghost"
                    size="sm"
                    class="nav-button"
                    @click=${(e: Event) => this.handleChildButtonClick(item.id, e)}
                  >
                    ${item.label}
                  </cds-button>
                </li>
              `)}
            </ul>
            <cds-button
              size="sm"
              @click=${this.handleParentClose}
              class="coachmark-stacked-home__footer"
            >
              Close
            </cds-button>
          </c4p-coachmark-body>
        </c4p-coachmark>
      </div>

      <!-- Child Coachmarks with their trigger buttons -->
      ${parentItems.map((item) => {
        const isOpen = this._openChildId === item.id;
        const nestedItem = nestedItems.find((nested) => nested.id === item.id);
        
        if (!nestedItem) return '';

        return html`
          <c4p-coachmark
            id="child-${item.id}"
            class="stacked_element_content"
            ?open=${isOpen}
            align=${POPOVER_ALIGNMENT.TOP}
            .highContrast=${true}
            .caret=${false}
            @c4p-coachmark-request-close=${(e: Event) => {
              e.stopPropagation();
              this.handleChildClose(e);
            }}
          >
            <!-- Use the button as the trigger -->
            <cds-button
              slot="trigger"
              id="coachmark-trigger-${item.id}"
              kind="ghost"
              size="sm"
              class="coachmark-stacked-home__nav-link"
              @click=${(e: Event) => this.handleChildButtonClick(item.id, e)}
            >
            </cds-button>
            <c4p-coachmark-header closeIconDescription="Close"></c4p-coachmark-header>
            <c4p-coachmark-body>
              ${nestedItem.type === 'simple' ? html`
                <div class="stacked-coachmark__content">
                  <h2 class="stacked-coachmark__title">${nestedItem.title}</h2>
                  <p class="stacked-coachmark__body">${nestedItem.text}</p>
                  <div class="stacked-coachmark__button">
                    <cds-button
                      class="done-btn"
                      size="sm"
                      @click=${this.handleChildClose}
                    >
                      Done
                    </cds-button>
                  </div>
                </div>
              ` : ''}
              
              ${nestedItem.type === 'carousel' ? html`
                <div class="exampleCarouselWrapper">
                  ${nestedItem.pages.map((page) => html`
                    <div>
                      <h2>${page.title}</h2>
                      <p>${page.text}</p>
                      ${page.button ? html`<p>${page.button}</p>` : ''}
                    </div>
                  `)}
                </div>
```

--------------------------------

### Example usage of theme zones with custom elements

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.mdx

Shows how to use theme zone classes (e.g., cds-theme-zone-white, cds-theme-zone-g100) with custom elements like cds-dropdown, cds-button, and cds-tag. Includes the themes.css link and module scripts for dropdown, button, and tag.

```html
<html>
<head>
  <link rel="stylesheet" href="https://1.www.s81c.com/common/carbon/web-components/tag/latest/themes.css" />
  <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/version/[v2.x.y]/dropdown.min.js"
    ></script>
    <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/version/[v2.x.y]/button.min.js"
    ></script>
     <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/version/[v2.x.y]/tag.min.js"
    ></script>

  ...
</head>
<body>
<cds-dropdown value="bar" class="cds-theme-zone-white">
      <cds-dropdown-item value="foo">Foo</cds-dropdown-item>
      <cds-dropdown-item value="bar">Bar</cds-dropdown-item>
      <cds-dropdown-item value="baz">Baz</cds-dropdown-item>
    </cds-dropdown>
    <div
      class="cds-theme-zone-g100"
      style="padding: 50px; background: var(--cds-background)"
    >
      <cds-button kind="tertiary">button</cds-button>
      <cds-tag filter type="red" title="Clear selection">
        This is a tag
      </cds-tag>
    </div>
  </div>
</body>
</html>
```

--------------------------------

### AILabel aiText prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/AILabel/AILabel.mdx

Shows how to change the text inside the AILabel using the aiText prop, useful for translations.

```jsx
<AILabel aiText="IA">
  <AILabelContent>Explanation of AI-generated content</AILabelContent>
</AILabel>
```

--------------------------------

### Use v10 compatibility themes with v11 tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Import the v10 compatibility themes and set the theme using the compat entrypoint. This ensures v10 tokens have correct values in v11.

```scss
@use '@carbon/styles/scss/compat/themes' as compat;
@use '@carbon/styles/scss/compat/theme' with (
  $theme: compat.$g100
);
```

--------------------------------

### DatePicker dateFormat prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Changes how the selected date is displayed in the input. The example uses datePickerType="single" and dateFormat="Y-m-d".

```jsx
<DatePicker datePickerType="single" dateFormat="Y-m-d">
  <DatePickerInput placeholder="mm/dd/yyyy" />
</DatePicker>
```

--------------------------------

### Default icon rendering

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon/icon.mdx

Renders the same three icons as the JavaScript example, but this is the code shown in the Storybook Canvas for the Default story.

```html
<cds-icon .icon="${Add16}"></cds-icon>
<cds-icon .icon="${ChevronRight16}"></cds-icon>
<cds-icon .icon="${Search16}"></cds-icon>
```

--------------------------------

### Basic Tooltip markup

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tooltip/tooltip.mdx

Example of using cds-tooltip with a button trigger and cds-tooltip-content. The child must be an interactive element, and the content must not contain interactive elements for accessibility.

```html
<cds-tooltip>
  <button type="button" aria-labelledby="content">X</button>
  <cds-tooltip-content id="content">
    Occasionally, services are updated in a specified time window to ensure no
    down time for customers.
  </cds-tooltip-content>
</cds-tooltip>

```

--------------------------------

### OptionsTile HTML example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/options-tile/options-tile.mdx

Basic usage of the cds-options-tile element with summary and body slots, plus attributes like size, titleText, and titleId.

```html
<cds-options-tile
  id="my-tile"
  size="lg"
  titleText="A title describing all included content."
  titleId="my-title">
  <div slot="summary">
    <span>A summary of the current state of content.</span>
  </div>
  <div slot="body">
    Additional detail or content will be shown when expanded.
  </div>
</cds-options-tile>
```

--------------------------------

### Mix-in class example using Subclass Factory Pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/coding-conventions.md

Shows how to define a mix-in class using the Subclass Factory Pattern, extending a base class with additional properties and methods.

```typescript
const Mixin = <T extends Constructor<SomeClass>>(Base: T) => class extends Base {
  ...

  someProperty = someValue;
  someMethod() { ... }

  ...
};
```

--------------------------------

### Dropdown initialSelectedItem prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

Use initialSelectedItem to set a default selected item without fully controlling the component. The example shows an array of strings and selecting the third item.

```jsx
const items = ['Option 1', 'Option 2', 'Option 3']

<Dropdown initialSelectedItem={items[2]} />
```

--------------------------------

### User-avatar with custom icon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/user-avatar/user-avatar.mdx

Example with a custom icon. Add the `slot="rendericon"` attribute to the element to specify a custom icon. The `theme` prop is set to "light".

```html
<cds-user-avatar
  name="Thomas J. Watson"
  background-color="order-1-cyan"
  size="md"
  tooltip-text="TW, Thomas J. Watson user profile"
  tooltip-alignment="right"
  theme="light">
  ${iconLoader(Group, { slot: 'rendericon' })}
</cds-user-avatar>
```

--------------------------------

### Run development server with yarn run serve

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/examples/vue-cli/README.md

Compiles and hot-reloads the project for development.

```bash
yarn run serve
```

--------------------------------

### WebComponentAdapter Integration with LitElement

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Demonstrates using WebComponentAdapter inside a LitElement component to integrate the state machine with a web component. Shows setup in connectedCallback, cleanup in disconnectedCallback, and wiring calendar events to adapter methods.

```typescript
import { WebComponentAdapter } from './state-machine/adapters/web-component-adapter';

// In your Web Component
class CDSDatePicker extends LitElement {
  private adapter?: WebComponentAdapter;

  connectedCallback() {
    super.connectedCallback();

    this.adapter = new WebComponentAdapter({
      component: this,
      initialContext: {
        mode: this._mode,
        dateFormat: this.dateFormat,
        minDate: this.minDate ? new Date(this.minDate) : null,
        maxDate: this.maxDate ? new Date(this.maxDate) : null,
      },
      onStateChange: (transition) => {
        // Handle state changes
      },
      onCalendarOpen: () => {
        // Handle calendar opening
      },
      onDateSelect: (context) => {
        // Handle date selection
      },
    });
  }

  disconnectedCallback() {
    this.adapter?.destroy();
    super.disconnectedCallback();
  }

  // Handle calendar events
  private setupCalendar() {
    this.calendar = createCalendar(input, {
      onChange: (selectedDates) => {
        this.adapter?.handleCalendarChange(selectedDates);
      },
      onOpen: () => {
        this.adapter?.handleCalendarOpen();
      },
      onClose: () => {
        this.adapter?.handleCalendarClose();
      },
    });
  }
}
```

--------------------------------

### Utility directory structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities-react/README.md

Directory structure for adding a new utility. Create a top-level directory under src/ with an index file and the utility source file.

```text
src/
  someReactUtility/
    index.tsx
    someReactUtility.tsx
```

--------------------------------

### Checkbox id Prop Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Checkbox/Checkbox.mdx

The id prop is required and should provide a unique identifier for each checkbox input. This example shows two checkboxes with distinct ids.

```jsx
<Checkbox labelText={`Checkbox label`} id="checkbox-label-1" />
<Checkbox labelText={`Checkbox label`} id="checkbox-label-2" />
```

--------------------------------

### Fixed container height example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Example 3: Fixed container height via inline style. The carousel respects the CSS height (400px) and does not override it.

```html
<div id="carousel" style="height: 400px">
  <div>Slide 1</div>
  <div>Slide 2</div>
</div>
```

```ts
const carousel = initCarousel(document.getElementById('carousel'));
// Container height remains 400px (CSS takes precedence)
```

--------------------------------

### Import Carbon Web Components and Icons for API Key Modal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/generate-an-api-key.mdx

Imports the Carbon web components (modal, button, text-input, password-input, inline-loading, form-group, radio-button, toggle) and icons (checkmark-filled, error-filled, information-filled, copy) needed for the generate-an-api-key example. Also imports the iconLoader utility to load icons.

```javascript
import '@carbon/web-components/es/components/modal/index.js';
import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/text-input/index.js';
import '@carbon/web-components/es/components/password-input/index.js';
import '@carbon/web-components/es/components/inline-loading/index.js';
import '@carbon/web-components/es/components/form-group/index.js';
import '@carbon/web-components/es/components/radio-button/index.js';
import '@carbon/web-components/es/components/toggle/index.js';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16.js';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16.js';
import InformationFilled16 from '@carbon/icons/es/information--filled/16.js';
import Copy16 from '@carbon/icons/es/copy/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
```

--------------------------------

### ComposedModal Footer Structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.mdx

Example of a ComposedModal footer containing multiple buttons with specific actions.

```jsx
<ComposedModal>
  ...
  <ModalFooter>
    <Button
      kind="secondary"
      onClick={() => { (Run some action...) setOpen(false); }}>
      Another button
    </Button>
    <Button
      kind="secondary"
      onClick={() => { (Run some action...) setOpen(false); }}>
      Secondary button
    </Button>
    <Button
      kind="primary"
      onClick={() => { (Run some action...) setOpen(false); }}>
      Primary button
    </Button>
  </ModalFooter>
</ComposedModal>
```

--------------------------------

### Example structure of $colors map

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/docs/sass.md

Illustrates the structure of the $colors map: each swatch (e.g., blue) maps to a map of grade numbers to hex codes.

```scss
$colors: (
  blue: (
    10: #edf5ff,
    20: #d0e2ff,
    30: #a6c8ff,
    40: #78a9ff,
    50: #4589ff,
    60: #0f62fe,
    70: #0043ce,
    80: #002d9c,
    90: #001d6c,
    100: #001141,
  ),
);
```

--------------------------------

### Import and use type tokens with @carbon/styles/scss/type

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Use the type package entrypoint to bring type tokens into your project. The example imports the type module and applies the 'productive-heading-01' type style to a selector.

```scss
@use '@carbon/styles/scss/type';

.my-selector {
  @include type.type-style('productive-heading-01');
}
```

--------------------------------

### Import from @carbon/styles

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Import the Carbon utilities SCSS from the @carbon/styles package.

```scss
@use '@carbon/styles/scss/_carbon-utilities.scss';
```

--------------------------------

### Basic About Modal HTML Structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/about-modal/about-modal.mdx

Basic about modal using cds-modal with header, body, version, and copyright text. The ?open binding controls visibility.

```html
<cds-modal aria-label="About this product" ?open="${this._open}">
  <div class="c4p--about-modal__logo">
    <img src="${logo}" alt="Example product or service logo" />
  </div>
  <cds-modal-header>
    <cds-modal-close-button close-button-label="Close"></cds-modal-close-button>
    <cds-modal-heading>IBM Product name</cds-modal-heading>
  </cds-modal-header>
  <cds-modal-body>
    <div class="c4p--about-modal__version">Version 0.0.0</div>
    <p class="c4p--about-modal__copyright-text">
      Copyright © IBM Corp. 2020, 2026
    </p>
  </cds-modal-body>
</cds-modal>
```

--------------------------------

### Import Carbon Web Components for About Modal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/about-modal/about-modal.mdx

Import the modal and link component modules from @carbon/web-components to enable the cds-modal and cds-link elements used in the about modal pattern.

```javascript
import '@carbon/web-components/es/components/modal/index.js';
import '@carbon/web-components/es/components/link/index.js';
```

--------------------------------

### Coachmark Tooltip Example (HTML)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/coachmark/coachmark.mdx

A basic coachmark with a beacon trigger, header, and body content. Uses the `open`, `high-contrast`, and `caret` attributes.

```html
<cds-coachmark
  align="bottom"
  open
  high-contrast
  caret
  selector-primary-focus=".done-button">
  <cds-coachmark-beacon label="Show information" expanded slot="trigger">
  </cds-coachmark-beacon>
  <cds-coachmark-header
    class="coachmark-header"
    close-icon-description="Close"></cds-coachmark-header>
  <cds-coachmark-body class="coachmark-body">
    <h2>Hello World</h2>
    <p>this is a description test</p>
    <cds-button size="sm">Done</cds-button>
  </cds-coachmark-body>
</cds-coachmark>
```

--------------------------------

### Import icons from @carbon/icons/es

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/icons.md

Demonstrates how to import icons from the built ES modules. The first import uses the 'cloud' prefix, the second uses the size '16'.

```javascript
import CloudMenu from '@carbon/icons/es/cloud/menu';
import Menu16 from '@carbon/icons/es/menu/16';
```

--------------------------------

### Validate release commit message

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Example commit message to look for after pulling the latest code.

```text
chore(release): v11.2.0-rc.0
```

--------------------------------

### PageHeader.Content

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Documentation for the PageHeader.Content component, including its props and usage example.

```APIDOC
## PageHeader.Content

### Description
Defines the primary content area of the PageHeader, including the title, subtitle, and any supporting text or contextual actions. It accepts a `title` prop to display the main heading and can optionally include a `renderIcon` prop to show an icon adjacent to the title. Child components such as `PageHeader.ContentText` can be used to provide additional descriptive text.

### Props
- **title** (string) - Required - The main heading text.
- **renderIcon** (ReactNode) - Optional - Icon to display adjacent to the title.
- **contextualActions** (ReactNode) - Optional - Components to render beside the content, e.g., tags.
- **pageActions** (ReactNode | Function) - Optional - Static React nodes or a function that receives `PageHeaderObserverState` to conditionally render actions based on scroll position.

### Example
```jsx
<PageHeader.Content
  title="Title text"
  contextualActions={
    <>
      <Tag className="tag" type="blue" size="lg">Tag</Tag>
    </>
  }
  pageActions={
    <PageHeader.ContentPageActions
      menuButtonLabel="Actions"
      actions={actionItems}
    />
  }
>
  <PageHeader.ContentText subtitle="Subtitle">
    Built for modern teams, our technology platform simplifies complexity with powerful APIs, real-time collaboration tools, and seamless integration.
  </PageHeader.ContentText>
</PageHeader.Content>
```
```

--------------------------------

### Default user-avatar example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/user-avatar/user-avatar.mdx

Basic usage of the user-avatar component with default theme. The background color and font color adapt dynamically based on the theme prop.

```html
<cds-user-avatar
  name="Thomas J. Watson"
  background-color="order-11-purple"
  size="lg"
  tooltip-text="TW, Thomas J. Watson user profile"
  tooltip-alignment="right"></cds-user-avatar>
```

--------------------------------

### PageHeader.Root observer callbacks

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Example of using onContentFullyCollapsed, onTitleClipped, and onContentActionsClipped callbacks to track scroll state changes.

```jsx
<PageHeader.Root
  onContentFullyCollapsed={(collapsed) => {
    console.log('Content fully collapsed:', collapsed);
  }}
  onTitleClipped={(clipped) => {
    console.log('Title clipped:', clipped);
  }}
  onContentActionsClipped={(clipped) => {
    console.log('Content actions clipped:', clipped);
  }}>
  {/* PageHeader children */}
</PageHeader.Root>
```

--------------------------------

### AI Label

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Describes the AI Label web component, its anatomy, and usage examples.

```APIDOC
## AI Label

### Description
Creates an AI Label component that acts as a toggle-tip trigger. The content of the callout is placed as child elements.

### Usage
```html
<cds-ai-label>Content Here</cds-ai-label>
```

### Anatomy
- The `AI Label` is a button that acts as a `toggle-tip` trigger.
- The contents of the callout are placed as children of `cds-ai-label`.
- An action bar can be rendered at the bottom of the callout by adding actions as children with the `slot="actions"` attribute.

### Example with Actions
```html
<cds-ai-label>
  {Content Here}
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(View16, { slot: 'icon' })}
    <span slot="tooltip-content"> View </span>
  </cds-icon-button>
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(FolderOpen16, { slot: 'icon' })}
    <span slot="tooltip-content"> Open folder</span>
  </cds-icon-button>
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(Folders16, { slot: 'icon' })}
    <span slot="tooltip-content"> Folders </span>
  </cds-icon-button>
  <cds-ai-label-action-button>View details</cds-ai-label-action-button>
</cds-ai-label>
```
```

--------------------------------

### Non-palette color token example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/tokens/README.md

Shows a token with its own color value, using a color object with colorSpace, components, and hex. The hex is what the build writes out.

```json
"button-danger-hover": {
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [0.721569, 0.098039, 0.129412],
    "hex": "#b81921"
  },
  "$description": "Background color for danger buttons on hover."
}
```

--------------------------------

### Dropdown items prop examples

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

The items prop accepts an array of strings or an array of objects. For objects, an itemToString function is required.

```jsx
<Dropdown
  items={['Option 0', 'Option 1', 'Option 2']}
/>


<Dropdown
  items={[
    { id: 'option-0', text: 'Option 0' },
    { id: 'option-1', text: 'Option 1' },
    { id: 'option-2', text: 'Option 2' },
  ]}
  itemToString={(item) => (item ? item.text : '')}
/>
```

--------------------------------

### Use dropdown via CDN with script module

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/welcome.mdx

Complete HTML example for using the dropdown component via CDN without a bundler. Includes the script tag for the component, custom styles to hide undefined elements, and the component markup.

```html
<!doctype html>
<html>
  <head>
    <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/tag/v2/latest/dropdown.min.js"></script>
    <style type="text/css">
      #app {
        font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
        width: 300px;
        margin: 2rem;
      }

      cds-dropdown:not(:defined),
      cds-dropdown-item:not(:defined) {
        visibility: hidden;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <cds-dropdown trigger-content="Select an item">
        <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
        <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
        <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
        <cds-dropdown-item value="dea">Option 4</cds-dropdown-item>
        <cds-dropdown-item value="router">Option 5</cds-dropdown-item>
      </cds-dropdown>
    </div>
  </body>
</html>
```

--------------------------------

### Usage identical to v11 component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/MIGRATION.md

Once destructured, usage is identical to the v11 component. This example shows a single date picker with an onChange handler.

```tsx
<DatePicker datePickerType="single" onChange={handleChange}>
  <DatePickerInput id="date" labelText="Date" placeholder="mm/dd/yyyy" />
</DatePicker>
```

--------------------------------

### Palette color token example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/tokens/README.md

Shows the required structure for a token that aliases a palette color. The $value uses the palette token path in curly braces, e.g., {gray.80}.

```json
"background-inverse": {
  "$type": "color",
  "$value": "{gray.80}",
  "$description": "Inverse background color for dark UI elements."
}
```

--------------------------------

### JavaScript: Import theme bindings

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Import theme objects, direct theme values, and specific token values from the package.

```js
import {
  // An object of all themes
  themes,

  // Direct theme values
  white,
  g10,
  g90,
  g100,

  // Specific token values
  background,
  interactive,
  textPrimary,
} from '@carbon/themes';
```

--------------------------------

### Build for production with yarn run build

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/examples/vue-cli/README.md

Compiles and minifies the project for production.

```bash
yarn run build
```

--------------------------------

### Tile radio icons codemod example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after JSX for the tile radio icons codemod. Wraps RadioTile with FeatureFlags enableV12TileRadioIcons.

```jsx
// Before
<RadioTile value="option1">Option 1</RadioTile>

// After
<FeatureFlags enableV12TileRadioIcons>
  <RadioTile value="option1">Option 1</RadioTile>
</FeatureFlags>
```

--------------------------------

### breakpoint-next function

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Gets the value of the next breakpoint.

```APIDOC
## `breakpoint-next` function

### Description
Gets the value of the next breakpoint.

### Parameters
- `$name` (String) - Required - The name of the current breakpoint.

### Returns
`Number` - The value of the next breakpoint.

### Usage
```scss
$next: breakpoint-next('md'); // returns value of 'lg'
```
```

--------------------------------

### breakpoint-prev function

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Gets the value of the previous breakpoint.

```APIDOC
## `breakpoint-prev` function

### Description
Gets the value of the previous breakpoint.

### Parameters
- `$name` (String) - Required - The name of the current breakpoint.

### Returns
`Number` - The value of the previous breakpoint.

### Usage
```scss
$prev: breakpoint-prev('lg'); // returns value of 'md'
```
```

--------------------------------

### Use useStepContext to get and set form state

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities-react/src/StepFlow/README.md

Any component inside of the step enabled component (StepProvider) can use useStepContext() to retrieve the step context state, giving the ability to get and set the state.

```tsx
const Step1 = () => {
  const { setFormState, formState } = useStepContext();
  const { email } = formState ?? {};
  return (
    <TextInput
      labelText="Email"
      value={email ?? ''}
      onChange={(e) => {
        setFormState((prev) => ({
          ...prev,
          email: e.target.value,
        }));
      }}
    />
  );
};
```

--------------------------------

### TreeView Controllable API

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/TreeView/TreeView.featureflag.mdx

Documentation for the TreeView controllable API feature flag, including behavior changes and an example.

```APIDOC
## TreeView Controllable API

### Description
Enables the controllable API for TreeView, allowing synchronization of `selected` and `active` state with the application. When enabled, `onActivate` is called with a node's ID, `onSelect` signature changes to `(selectedIDs)`, and updating `selected` or `active` props updates internal state and re-renders.

### Feature Flag
`enable-treeview-controllable`

### Behavior Changes
- **TreeView**
  - `props.onActivate` called with node's ID when activated.
  - `props.onSelect` signature changes from `(event, selectedIDs)` to `(selectedIDs)`.
  - Updating `props.selected` or `props.active` updates internal state and re-renders.
- **TreeNode**
  - `props.onToggle` signature changes from `(event, { id, isExpanded, label, value })` to `(isExpanded)`.
  - `props.defaultIsExpanded` added for default state in uncontrolled mode.

### Example
```jsx
function SynchronizedTreeView() {
  const [selected, setSelected] = useState([]);
  const [active, setActive] = useState(null);

  return (
    <FeatureFlags enableTreeViewControllable>
      <TreeView
        selected={selected}
        onSelect={setSelected}
        active={active}
        onActivate={setActive}>
        ...
      </TreeView>
    </FeatureFlags>
  );
}
```
```

--------------------------------

### Playwright Component Test with visitStory

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/testing.md

Example Playwright test file for a component, iterating over themes and using visitStory from e2e/test-utils/storybook. Place in the e2e directory with the *-test.e2e.js pattern.

```js
// e2e/components/component/component-test.e2e.js

'use strict';

const { test } = require('@playwright/test');
const { themes } = require('../../test-utils/env');
const { visitStory } = require('../../test-utils/storybook');

test.describe('component-name @vrt', () => {
  themes.forEach((theme) => {
    test(theme, async ({ page }) => {
      await visitStory(page, {
        component: 'component',
        story: 'story-name',
        globals: { theme },
      });
    });
  });
});
```

--------------------------------

### Use type class in HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Add the appropriate type class to an element to style it. This example uses the cds--type-mono class.

```html
<span className="cds--type-mono">Test sentence</span>
```

--------------------------------

### AutoSaving component example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/Saving/Saving.mdx

Example implementation of the auto-save variant. Uses a debounced effect to set status to 'in-progress' then 'success' after a delay. Hides the status indicator until the user makes their first change (dirtyInput) and when status returns to 'default'.

```jsx
export const AutoSaving = () => {
  const [status, setStatus] = useState('default');
  const [text, setText] = useState('');
  const [dirtyInput, setDirtyInput] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (dirtyInput) {
        setStatus('in-progress');
        await wait(1000);
        setStatus('success');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [text, dirtyInput]);

  const onChangeHandler = (evt) => {
    const { value } = evt.target;
    if (!dirtyInput) setDirtyInput(true);
    setText(value);
  };

  return (
    <main>
      <TextArea
        id="save-auto-textarea"
        onChange={onChangeHandler}
        value={text}
        labelText="Enter in the thing you wanted saved"
        className="saving-story-textarea"
      />
      {dirtyInput && status !== 'default' && (
        <Saving
          type="auto"
          status={status}
          inProgressText="Saving..."
          successText="Saved"
          failText="Failed to save"
        />
      )}
    </main>
  );
};
```

--------------------------------

### Build command for layout tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/tokens/README.md

Run from the packages/layout directory to regenerate Sass and JS outputs after editing layout.tokens.json.

```bash
cd packages/layout
yarn build

```

--------------------------------

### Import preview component with alias

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/preview-code.md

Import a preview component using the `preview_` prefix and alias it to the original name for use in your project.

```jsx
import { preview_ComponentName as ComponentName } from '@carbon/react';
```

--------------------------------

### Import preview__DatePicker namespace

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/MIGRATION.md

Replace the classic import with the preview__DatePicker namespace and destructure the components. The JSX stays the same.

```diff
- import { DatePicker, DatePickerInput } from '@carbon/react';
+ import { preview__DatePicker } from '@carbon/react';
+
+ const { DatePicker, DatePickerInput, DatePickerSkeleton } = preview__DatePicker;
```

--------------------------------

### Modal danger variant

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.mdx

Example of a Modal component configured with the danger prop.

```jsx
<Modal danger>
  <ModalHeader />
  <p className="cds--modal-content__text">The modal body content</p>
</Modal>
```

--------------------------------

### About Modal with Additional Content and Footer

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/about-modal/about-modal.mdx

Extended about modal with emphasized title, cds-link list, legal copy, and footer with technology logos. Use cds-link for product information only, not help content.

```html
<cds-modal aria-label="About this product" ?open="${this._open}">
  <div class="c4p--about-modal__logo">
    <img src="${logo}" alt="Example product or service logo" />
  </div>
  <cds-modal-header>
    <cds-modal-close-button close-button-label="Close"></cds-modal-close-button>
    <cds-modal-heading>
      IBM <span class="c4p--about-modal__title-emphasis">Product name</span>
    </cds-modal-heading>
  </cds-modal-header>
  <cds-modal-body>
    <div class="c4p--about-modal__version">Version 0.0.0</div>
    <div class="c4p--about-modal__links-container">
      <cds-link href="#">Link action</cds-link>
      <cds-link href="#">Link action</cds-link>
    </div>
    <p class="c4p--about-modal__content">${legalCopy}</p>
    <p class="c4p--about-modal__copyright-text">
      Copyright © IBM Corp. 2020, 2026
    </p>
  </cds-modal-body>
  <cds-modal-footer>
    <p class="c4p--about-modal__footer-label">Powered by</p>
    <img src="${grafanaLogo}" alt="Grafana" class="c4p--about-modal__tech-logo" />
  </cds-modal-footer>
</cds-modal>
```

--------------------------------

### Instant generate API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Instant Generate' pattern for the APIKeyModal component. The modal generates an API key immediately without requiring user input.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-instant-generate">Instant Generate</button>

<cds-api-key-modal id="api-key-modal-instant-generate" title="Generate API key" description="Generate a new API key for your application." instant-generate>
</cds-api-key-modal>
```

--------------------------------

### Basic DatePickerStateMachine Usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Shows how to create a DatePickerStateMachine instance, send events such as INPUT_FOCUS and DATE_SELECT, retrieve the current state and context, subscribe to state changes, and clean up the subscription.

```typescript
import { DatePickerStateMachine, DatePickerEvent } from './state-machine';

// Create a new state machine
const machine = new DatePickerStateMachine({
  mode: 'single',
  dateFormat: 'm/d/Y',
  closeOnSelect: true,
});

// Send events
machine.send(DatePickerEvent.INPUT_FOCUS);
machine.send(DatePickerEvent.CALENDAR_OPEN);
machine.send(DatePickerEvent.DATE_SELECT, { date: new Date() });

// Get current state and context
const state = machine.getState();
const context = machine.getContext();

// Subscribe to state changes
const unsubscribe = machine.subscribe((transition) => {
  console.log('State changed:', transition.from, '->', transition.to);
  console.log('New context:', transition.context);
});

// Cleanup
unsubscribe();
```

--------------------------------

### textarea property example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Configures a `text` or `textarea` property. Accepts standard Carbon `TextInputProps` / `TextAreaProps` via `config`, plus an optional `operators` array to override defaults.

```js
{ id: 'description', label: 'Description', type: 'textarea', config: {} }
```

--------------------------------

### IBM Plex Arabic font file paths

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Example paths for IBM Plex Arabic fonts in the `@ibm/plex` package, showing complete Regular woff2 and Light woff files.

```bash
# Complete, Regular weight, woff2 format
@ibm/plex/IBM-Plex-Arabic/fonts/complete/woff2/IBMPlexArabic-Regular.woff2

# Complete, Light weight, woff format
@ibm/plex/IBM-Plex-Arabic/fonts/complete/woff/IBMPlexArabic-Light.woff
```

--------------------------------

### Build all package files

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run this command to build all package files so that things don't fail while working on a package.

```bash
yarn build
```

--------------------------------

### Importing the grid in v11 (React)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

For React projects, use '@carbon/react/scss/grid' to import the grid styles.

```scss
@use '@carbon/react/scss/grid';
```

--------------------------------

### Example of the saved callback pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows the saved callback pattern using useRef to keep the latest callback without re-running the effect when the callback changes.

```js
function useEvent(element, eventName, callback) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    function listener(event) {
      savedCallback.current(event);
    }
    element.addEventListener(eventName, listener);
    return () => {
      element.removeEventListener(eventName, listener);
    };
  }, [element, eventName]);
}
```

--------------------------------

### MultiSelect with label property

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Example of using the label property within the items array to ensure proper rendering.

```jsx
<MultiSelect
  useTitleInItem={false}
  label="MultiSelect Label"
  invalid={false}
  invalidText="Invalid Selection"
  onChange={onChange}
  items={[
    { id: 'item-1', text: 'Item 1', label: 'Item 1' },
    { id: 'item-2', text: 'Item 2', label: 'Item 2' },
  ]}
  itemToString={itemToString}
  initialSelectedItems={[
    { id: 'item-1', text: 'Item 1' },
    { id: 'item-2', text: 'Item 2' },
  ]}
  translateWithId={translateWithId}
/>
```

--------------------------------

### Run wc-add-barrel-imports codemod with --write

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Applies the barrel import rewrite. Migrations run dry unless --write is passed.

```sh
npx @carbon/upgrade migrate wc-add-barrel-imports --write
```

--------------------------------

### EditInPlace HTML example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/edit-in-place/edit-in-place.mdx

Basic HTML usage of the EditInPlace component with required attributes for value, labels, and action buttons.

```html
<cds-edit-in-place
  id="my-edit"
  value="Edit me"
  label-text="Editable field"
  edit-label="Edit"
  save-label="Save"
  cancel-label="Cancel"></cds-edit-in-place>
```

--------------------------------

### MultiSelect with custom itemToString method

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Example of using the itemToString prop to map items to string labels when the label property is missing.

```jsx
<MultiSelect
  useTitleInItem={false}
  label="MultiSelect Label"
  invalid={false}
  invalidText="Invalid Selection"
  onChange={onChange}
  items={[
    { id: 'item-1', text: 'Item 1' },
    { id: 'item-2', text: 'Item 2' },
  ]}
  initialSelectedItems={[
    { id: 'item-1', text: 'Item 1' },
    { id: 'item-2', text: 'Item 2' },
  ]}
  translateWithId={translateWithId}
  itemToString={(item) => (item ? item.text : '')}
/>
```

--------------------------------

### GuideBanner HTML usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/guide-banner/guide-banner.mdx

Basic HTML usage of the cds-guide-banner element. It includes attributes for collapse/expand button labels, a title, and an open state. The body slot is where guide banner elements are placed.

```html
<cds-guide-banner
  collapseButtonLabel="Read less"
  expandButtonLabel="Read more"
  titleText="Page-related heading that can stand on its own"
  open>
  <div slot="body">
    <!-- Guide banner elements go here -->
  </div>
</cds-guide-banner>
```

--------------------------------

### Sass: Include default theme

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Include the package and initialize the default white theme in your Sass file.

```scss
@use '@carbon/themes/scss/themes';
```

--------------------------------

### Checkbox defaultChecked Prop Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Checkbox/Checkbox.mdx

Use the defaultChecked prop to set the initial checked state of a checkbox on page load. This example shows two checkboxes with defaultChecked set to true.

```jsx
<Checkbox defaultChecked labelText={`Checkbox label`} id="checkbox-label-1" />
<Checkbox defaultChecked labelText={`Checkbox label`} id="checkbox-label-2" />
```

--------------------------------

### DatePicker value prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/__stories__/DatePickerV2.mdx

Pass a string value to either the DatePicker or the child DatePickerInput to initialize the selected date.

```tsx
<DatePicker value="04/17/2025">
  <DatePickerInput id="date" placeholder="mm/dd/yyyy" />
</DatePicker>
```

--------------------------------

### Import grid styles via @carbon/styles

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows two ways to include grid styles: importing the central @carbon/styles entrypoint or the grid-specific stylesheet directly.

```scss
// All the grid styles are included through this central entrypoint
@use '@carbon/styles';

// Alternatively, the grid styles can be brought in on their own
@use '@carbon/styles/scss/grid';
```

--------------------------------

### Icon source and built directory structures

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/icons.md

Shows the source directory structure for icons and the resulting built module structure. The source has a prefixed icon under 'cloud' and a size-based icon under '16', which are transformed into separate module paths.

```text
svg
├── cloud
│   └── menu.svg
├── 16
│   └── menu.svg
```

```text
es
├── cloud
│   └── menu
│   │   └── index.js
├── menu
│   └── 16.js
```

--------------------------------

### AccordionItem onHeadingClick prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

Use the onHeadingClick prop to determine the state of the AccordionItem when it is clicked. It returns an object with isOpen.

```jsx
<Accordion>
  <AccordionItem onHeadingClick={({ isOpen }) => console.log(isOpen)}>
    Panel A
  </AccordionItem>
</Accordion>
```

--------------------------------

### Dropdown direction prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

Use direction="top" to render the menu above the dropdown when it's near the bottom of the page.

```jsx
<Dropdown direction="top" />
```

--------------------------------

### Using the `as` prop with a custom component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/Grid.mdx

Shows how to pass a custom component to the `as` prop. The custom component must accept all props passed to it, such as a class name. The example defines an `Article` component and a `CustomColumn` component that uses `Column as={Article}`.

```jsx
import { Grid, Column } from '@carbon/react';

function Article({ children, ...rest }) {
  return <article {...rest}>{children}</article>;
}

function CustomColumn({ children, ...rest }) {
  return <Column as={Article} {...rest}>{children}</Column:}

function MyComponent() {
  return (
    <Grid>
      <CustomColumn>Example content</Column>
      <CustomColumn>Example content</Column>
      <CustomColumn>Example content</Column>
      <CustomColumn>Example content</Column>
    </Grid>
  );
}
```

--------------------------------

### getTopLevelSelectedItems: Get top-level selected items

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Returns only top-level selected items (items without selected ancestors). Useful for getting the minimal set of selected items.

```typescript
const topLevel = dataManager.getTopLevelSelectedItems();
```

--------------------------------

### Use motion mixin and duration token

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Imports the motion package and applies a transition using the motion mixin and duration token.

```scss
@use '@carbon/styles/scss/motion' as *;

.my-selector {
  transition: transform $duration-fast-02 motion(standard, productive);
}
```

--------------------------------

### css-grid mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Generates the CSS for using the CSS Grid, including responsive classes for column spans, starts, ends, and visibility.

```APIDOC
## `css-grid` mixin

### Description
Generates the CSS for using the CSS Grid, including responsive classes for column spans, starts, ends, and visibility.

### Usage
```scss
@use '@carbon/grid';
@include grid.css-grid();
```

### Parameters
None.

### Returns
CSS output for the CSS Grid.
```

--------------------------------

### Import and use a component from carbon-components-react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/carbon-components-react/README.md

Import and use a component directly from the carbon-components-react package. This example shows a Button component in a React function component.

```jsx
import { Button } from 'carbon-components-react';

function MyComponent() {
  return <Button>Example usage</Button>;
}
```

--------------------------------

### DatePicker className prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Forwards a custom class name to the underlying wrapper div.cds--date-picker element for layout purposes.

```jsx
<DatePicker className="some-class">...</DatePicker>
```

--------------------------------

### Using @carbon/layout spacing tokens and rem()

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/docs/sass.md

Import the layout package and use spacing tokens and rem conversion in a selector.

```scss
@use '@carbon/layout';

.selector {
  margin-bottom: layout.$spacing-05;
  width: layout.rem(24px);
  height: layout.rem(24px);
}
```

--------------------------------

### ComposedModal with ModalFooter danger variant

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.mdx

Example of a ComposedModal component using ModalFooter with danger, primaryButtonText, and secondaryButtonText props.

```jsx
<ComposedModal>
  ...
  <ModalFooter danger primaryButtonText="OK" secondaryButtonText="Cancel" />
</ComposedModal>
```

--------------------------------

### v10 Button with renderIcon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Button/migrate-to-7.x.md

Shows how to use the `renderIcon` prop in v10, which takes a React component from `@carbon/icons-react` instead of the v9 `icon` prop. The example imports `AddFilled16` and passes it to `renderIcon`.

```javascript
import AddFilled16 from '@carbon/icons-react/lib/add--filled/16';

...

<Button renderIcon={AddFilled16} />
```

--------------------------------

### Using inputProps with maxLength in ComboBox

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComboBox/ComboBox.mdx

Example of using the inputProps prop to set the native maxLength attribute on the input. When using maxLength, ensure the limit is communicated through helperText and invalidText/warnText.

```jsx
<ComboBox
  inputProps={{ maxLength: 5 }}
  titleText="Abbreviation"
  helperText="Provide an abbreviation that is 5 characters or less"
  invalidText="Abbreviations must be 5 characters or less"
  warnText="Abbreviations must be 5 characters or less"
/>
```

--------------------------------

### Class names with prefix and BEM

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Prefix all class names with #{$prefix}-- in SCSS, which becomes cds-- by default. The HTML example shows the prefixed classes, and the SCSS shows the corresponding selectors. BEM naming convention is used with the prefix.

```html
<div
  class="cds--inline-notification cds--inline-notification--error"
  role="alert">
  <div class="cds--inline-notification__details">...</div>
</div>
```

```scss
.#{$prefix}--inline-notification {
  ...
}

.#{$prefix}--inline-notification__details {
  ...
}
```

```scss
.#{$prefix}--block
.#{$prefix}--block__element
.#{$prefix}--block--modifier
```

--------------------------------

### BreadcrumbItem isCurrentPage prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Breadcrumb/Breadcrumb.mdx

Use the `isCurrentPage` prop on a `BreadcrumbItem` to indicate the current page in the breadcrumb. This example shows a breadcrumb with three items, where the last item is marked as the current page.

```jsx
<Breadcrumb>
  <BreadcrumbItem href="#">Breadcrumb 1</BreadcrumbItem>
  <BreadcrumbItem href="#">Breadcrumb 2</BreadcrumbItem>
  <BreadcrumbItem href="#" isCurrentPage>
    Breadcrumb 3
  </BreadcrumbItem>
</Breadcrumb>
```

--------------------------------

### Importing accordion in v11 (React)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

For React, use '@carbon/react/scss/components/accordion'.

```scss
// For React
@use '@carbon/react/scss/components/accordion';
```

--------------------------------

### Importing the grid in v11 (styles)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, the grid entry point moved to 'scss/_grid.scss' and re-exports from '@carbon/grid'. The default grid is now 16 columns and uses CSS Grid instead of flexbox.

```scss
@use '@carbon/styles/scss/grid';
```

--------------------------------

### Import Carbon Web Components for Export Modal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/export-modal/export-modal.mdx

Imports the necessary Carbon web components (modal, button, form-group, text-input, loading) and icons (CheckmarkFilled16, ErrorFilled16) for the export modal example. Use these imports before using the modal HTML.

```javascript
import '@carbon/web-components/es/components/modal/index.js';
import '@carbon/web-components/es/components/button/index';
import '@carbon/web-components/es/components/form-group/index';
import '@carbon/web-components/es/components/text-input/index';
import CheckmarkFilled16 from '@carbon/icons/es/checkmark--filled/16';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16';
import '@carbon/web-components/es/components/loading/index';
```

--------------------------------

### Coachmark Floating Example (HTML)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/coachmark/coachmark.mdx

A floating coachmark variant with a button trigger. Uses the `floating` attribute and includes drag functionality.

```html
<cds-coachmark align="bottom" open high-contrast floating>
  <cds-button kind="tertiary" slot="trigger" class="trigger-btn"
    >Show information
  </cds-button>
  <cds-coachmark-header
    class="coachmark-header"
    close-icon-description="Close"
    drag-icon-description="Drag"></cds-coachmark-header>
  <cds-coachmark-body class="coachmark-body">
    <h2>Hello World</h2>
    <p>this is a description test</p>
    <cds-button size="sm">Done</cds-button>
  </cds-coachmark-body>
</cds-coachmark>
```

--------------------------------

### Importing DataTable action styles in v11

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Import the action module for DataTable action styles.

```scss
@use '@carbon/styles/scss/components/data-table/action';
```

--------------------------------

### BigNumber Lit example with custom icons

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/big-number/big-number.mdx

Lit template for BigNumber with custom icons, including imports for iconLoader and icon modules, and usage of cds-icon-button.

```javascript
import { html } from 'lit';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import ArrowDown16 from '@carbon/icons/es/arrow--down/16.js';
import Edit16 from '@carbon/icons/es/edit/16.js';
import '@carbon/web-components/es/components/icon-button/index.js';

html`
  <c4p-big-number
    fraction-digits=${fractionDigits}
    label=${label}
    .value=${value}
    .total=${total}
    size=${size}
    locale=${locale}
    ?trending=${trending}
    ?truncate=${truncate}
    ?percentage=${percentage}
    ?loading=${loading}>
        ${iconLoader(getTrendingIcon(size), {
      slot: 'trending-icon',
      class: `${prefix}--big-number__trend`,
    })}
        <cds-icon-button
      kind="ghost"
      size="sm"
      align="bottom"
      slot="icon-button">
              ${iconLoader(Edit16, {
        slot: 'icon',
      })}
              <span slot="tooltip-content">Icon description</span>
          </cds-icon-button
    >
  </c4p-big-number>
`;
```

--------------------------------

### Breadcrumb noTrailingSlash prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Breadcrumb/Breadcrumb.mdx

Use the `noTrailingSlash` prop on the `Breadcrumb` component to omit the trailing slash from the current page. This example shows a breadcrumb with three items, where the last item does not display a slash.

```jsx
<Breadcrumb noTrailingSlash>
  <BreadcrumbItem href="#">Breadcrumb 1</BreadcrumbItem>
  <BreadcrumbItem href="#">Breadcrumb 2</BreadcrumbItem>
  <BreadcrumbItem href="#">Breadcrumb 3</BreadcrumbItem>
</Breadcrumb>
```

--------------------------------

### Importing DataTable skeleton styles in v11

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Import the skeleton module for DataTable skeleton styles.

```scss
@use '@carbon/styles/scss/components/data-table/skeleton';
```

--------------------------------

### Manual saving HTML markup with cds-button and cds-inline-loading

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/saving/saving.mdx

Shows the HTML for the manual saving example. The primary button includes an inline loading indicator that reflects the save state (default, in progress, saved, or failed).

```html
<div class="saving__buttons">
  <cds-button kind="secondary" disabled type="button">Cancel</cds-button>
  <cds-button kind="primary" type="button">
    Save
    <cds-inline-loading
      slot="icon"
      active
      description="Loading"
      assistive-text="Loading"></cds-inline-loading>
  </cds-button>
</div>
```

--------------------------------

### Dropdown with custom label

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/dropdown/dropdown.mdx

Sets the label text for the dropdown using the 'label' attribute. The example uses a small size dropdown with two options.

```html
<cds-dropdown label="Dropdown label" size="sm" title-text="Label">
  <cds-dropdown-item value="option-1">Option 1</cds-dropdown-item>
  <cds-dropdown-item value="option-2">Option 2</cds-dropdown-item>
</cds-dropdown>
```

--------------------------------

### IBM Plex Sans font file paths

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Example paths for IBM Plex Sans fonts in the `@ibm/plex` package, covering complete Regular woff2, Italic woff2, and split Bold Italic woff2.

```bash
# Complete, Regular weight, woff2 format
@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2

# Complete, Italic, Regular weight, woff2 format
@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Italic.woff2

# Split (Pi), Bold, Italic, woff2
@ibm/plex/IBM-Plex-Sans/fonts/split/woff2/IBMPlexSans-BoldItalic-Pi.woff2
```

--------------------------------

### Import required Carbon web components for saving pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/saving/saving.mdx

Import the textarea, button, and inline-loading components needed for the auto-saving and manual-saving examples.

```javascript
import '@carbon/web-components/es/components/textarea/index.js';
import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/inline-loading/index.js';
```

--------------------------------

### Importing DataTable expandable styles in v11

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Import the expandable module for DataTable expandable styles.

```scss
@use '@carbon/styles/scss/components/data-table/expandable';
```

--------------------------------

### Configuring Carbon in v10

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v10, global flags like $prefix and $css--reset were set before importing Carbon.

```scss
$prefix: 'cds';
$css--reset: false;

@import 'path/to/carbon';
```

--------------------------------

### Import and use colors package

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Import the colors package and reference a color swatch by grade, e.g., colors.$blue-50.

```scss
@use '@carbon/styles/scss/colors';

.my-selector {
  background-color: colors.$blue-50;
}
```

--------------------------------

### Generate API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Generate' pattern for the APIKeyModal component. The modal is triggered by a button and displays a form to generate an API key.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-generate">Generate</button>

<cds-api-key-modal id="api-key-modal-generate" title="Generate API key" description="Generate a new API key for your application.">
  <cds-text-input label="API key name" placeholder="My API key"></cds-text-input>
</cds-api-key-modal>
```

--------------------------------

### Use type-scale function to set font-size

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Use the type-scale function to get a specific step in the type scale, e.g., step 1.

```scss
.my-selector {
  font-size: type.type-scale(1);
}
```

--------------------------------

### Importing DataTable in v10

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v10, DataTable styles were bundled into one import.

```scss
@import 'carbon-components/scss/components/data-table/data-table';
```

--------------------------------

### Using the `as` prop to change Column to a section element

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/Grid.mdx

Changes the `Column` component to render as an `article` element using the `as` prop. The example shows four columns, each with the `as` prop set to `"article"`.

```jsx
import { Grid, Column } from '@carbon/react';

function MyComponent() {
  return (
    <Grid>
      <Column as="article">Example content</Column>
      <Column as="article">Example content</Column>
      <Column as="article">Example content</Column>
      <Column as="article">Example content</Column>
    </Grid>
  );
}
```

--------------------------------

### Example of hooks that rely on refs without accepting a ref

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows a component using useHover and useDrag hooks that return refs, illustrating the problem of merging multiple refs.

```jsx
function MyComponent() {
  const [ref1, isHovering] = useHover();
  const [ref2, isDragging] = useDrag();

  // How should the caller merge these two refs?
}
```

--------------------------------

### Use CSS logical properties

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Use CSS logical properties for layout to support right-to-left styling. The example contrasts physical properties (padding-top, margin-left, top) with logical equivalents (padding-block-start, margin-inline-start, inset-block-start).

```scss
// Don't do this
.my-element {
  padding-top: 2em;
  padding-bottom: 2em;
  margin-left: 2em;
  position: relative;
  top: 0.2em;
}

// Do this instead
.my-element {
  padding-block-start: 2em;
  padding-block-end: 2em;
  margin-inline-start: 2em;
  position: relative;
  inset-block-start: 0.2em;
}
```

--------------------------------

### Importing the grid in v10

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v10, the flexbox grid was imported from 'carbon-components/scss/globals/grid/grid'. This entry point has moved in v11.

```scss
@import 'carbon-components/scss/globals/grid/grid';
```

--------------------------------

### Dropdown light prop example (deprecated)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

The light prop toggles the light variant for contrast on same-colored backgrounds. It is deprecated; use the Layer component instead.

```jsx
<Dropdown light>...</Dropdown>
```

--------------------------------

### Importing accordion in v10

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v10, accordion styles were imported from 'carbon-components/scss/components/accordion/accordion'.

```scss
@import 'carbon-components/scss/components/accordion/accordion';
```

--------------------------------

### Import @carbon/colors in Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Shows two ways to import the colors module in Sass: directly from @carbon/colors or via @carbon/react.

```scss
@use '@carbon/colors';

// Another way if using `@carbon/react
@use '@carbon/react/scss/colors';
```

--------------------------------

### DatePicker minDate prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/__stories__/DatePickerV2.mdx

Limits date selection to any date after the specified date. Dates before the minimum date are disabled in the calendar and navigation is restricted.

```tsx
<DatePicker minDate="01/01/2024">
  <DatePickerInput id="date" placeholder="mm/dd/yyyy" />
</DatePicker>
```

--------------------------------

### Dropdown size variants (sm, md, lg)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Dropdown/Dropdown.mdx

Three sizes are available: sm, md (default), and lg. The example shows all three sizes with labels and titleText.

```jsx
<Dropdown
  items={['Option 1', 'Option 2', 'Option 3']}
  size="sm"
  label="Small [sm]"
  titleText="Label"
/>
<Dropdown
  items={['Option 1', 'Option 2', 'Option 3']}
  label="Medium [md]"
  size="md"
  titleText="Label"
/>
<Dropdown
  items={['Option 1', 'Option 2', 'Option 3']}
  size="lg"
  label="Large [lg]"
  titleText="Label"
/>
```

--------------------------------

### Toggletip basic usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Toggletip/Toggletip.mdx

Basic implementation of a Toggletip with a button trigger and custom content. Import the required components and icons, then structure the Toggletip with ToggletipButton and ToggletipContent. This example is suitable for interactive content; otherwise, use Tooltip instead.

```jsx
import { Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import { Information } from '@carbon/react/icons';

<Toggletip>
  <ToggletipButton label="Additional information">
    <Information />
  </ToggletipButton>
  <ToggletipContent>
    <p>Custom content here</p>
  </ToggletipContent>
</Toggletip>;
```

--------------------------------

### Override button-primary token without central entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Alternative to the central entrypoint example: import only the reset and button component styles instead of the full @carbon/react package. The diff shows replacing the central import with the two specific imports.

```diff
  @use '@carbon/react/scss/themes';
  @use '@carbon/react/scss/components/button/tokens' with (
    $button-primary: #3f51b5
  );

- @use '@carbon/react';
+ @use '@carbon/react/scss/reset';
+ @use '@carbon/react/scss/components/button';
```

--------------------------------

### Enable v12 tile radio icons with FeatureFlags and Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tile/Tile.featureflag.mdx

Enables the `enable-v12-tile-radio-icons` flag to change RadioTile to use radio button icons instead of checkmark icons. The React example wraps the app in `FeatureFlags`, and the Sass example sets the corresponding feature flag.

```jsx
<FeatureFlags enableV12TileRadioIcons>
  <App />
</FeatureFlags>
```

```css
@use '@carbon/react/scss/feature-flags' with (
  $feature-flags: ('enable-v12-tile-radio-icons': true)
);
```

--------------------------------

### cds-selectable-tile (legacy) various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for a selectable tile using legacy 'bx--' classes with various attributes. The input has name and value attributes, and the label has class 'bx--tile--light'.

```html
<input
  class="bx--tile-input"
  id="input"
  name="name-foo"
  tabindex="-1"
  type="checkbox"
  value="value-foo"
>
<label
  class="bx--tile bx--tile--light bx--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="bx--tile__checkmark">
  </div>
  <div class="bx--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### DatePicker value as string and object

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Sets the initial value of the DatePicker. The first example uses a date string ('07/15/1988'), the second uses a Date object (new Date()).

```jsx
<DatePicker datePickerType="single" value="07/15/1988">
  <DatePickerInput
    placeholder="dd/mm/yyyy"
    id="date-picker-6"
    labelText="Value as string example"
  />
</DatePicker>
<br />
<DatePicker datePickerType="single" value={new Date()}>
  <DatePickerInput
    placeholder="dd/mm/yyyy"
    id="date-picker-7"
    labelText="Value as object example"
  />
</DatePicker>
```

--------------------------------

### Recipe: Asserting a module's Public API with sass:meta

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Use this recipe to verify that a module's Public API (variables and functions) matches expectations. It uses sass:meta helpers to get module variables and functions, and checks mixin existence with `mixin-exists`. Run `yarn test -u` to update the snapshot.

```javascript
test('Public API', async () => {
  await render(`
    @use 'sass:meta';
    @use '../path/to/module';

    // Get the variables for the module under the namespace `module`
    $_: get('variables', meta.module-variables('module'));

    // Get the functions for the module under the namespace `module`
    $_: get('variables', meta.module-functions('module'));

    // Verify that a mixin exists, optionally within a module
    $_: get('mixin-name', meta.mixin-exists('mixin-name', 'module'));
  `);
});

```

--------------------------------

### Navigation card with router Link

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Card/Card.mdx

Use any router's Link component the same way as as="a". This example shows React Router's Link component.

```jsx
// React Router
<Card clickable as={Link} to="/dashboard" aria-label="Go to dashboard">
  ...
</Card>
```

--------------------------------

### Using the useLayer hook to get the current layer level

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Layer/Layer.mdx

Shows how to use the `useLayer` hook to get the current layer level. The hook returns an object with the `level` property, which updates automatically if the Layer structure changes. The level can be 0, 1, or 2.

```jsx
function ExampleComponent() {
  const { level } = useLayer();

  // ...
}
```

--------------------------------

### Update import to date-picker/next/index.js

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/MIGRATION.md

Shows the import path change from the classic date picker to the preview date picker. Replace the classic import with the new one from 'date-picker/next/index.js'.

```diff
- import '@carbon/web-components/es/components/date-picker/index.js';
+ import '@carbon/web-components/es/components/date-picker/next/index.js';
```

--------------------------------

### Move preview component to stable checklist

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/preview-code.md

Checklist to paste into a GitHub issue when requesting a component move from preview to stable. Covers stabilization, documentation, React and Web Component implementation, styles, parity, and misc details.

```markdown
### Requirements to move to stable

- [ ] The preview code has stabilized
  - [ ] A consuming project has given feedback on the visual design, UX, and dev
        API/implementation
  - [ ] The preview code has been available for a reasonable amount of time (~3
        months) in aim to catch potential defects with spec, implementation,
        accessibility, etc.

---

- [ ] Component is documented on the website
  - [ ] Component has a usage, style, and code tab
  - [ ] Component has a component demo

---

- [ ] React implementation is complete
  - [ ] All components exported in `src/index.js` and should not be `preview_`
        prefixed
  - [ ] Component is written as a function declaration and uses `forwardRef`
  - [ ] Component has `propTypes`
    - [ ] Each prop type has a comment (used in storybook)
    - [ ] Prop types are as specific as needed, prefer `PropTypes.shape` over
          `PropTypes.object` if possible
  - [ ] Component has a TypeScript interface that mirrors `propTypes`
  - [ ] API comments (in propTypes and TS interface) are the exact same
  - [ ] Default props are listed as default args in the function definition (not
        in defaultProps)
    - [ ] Note: default props should be stable, in other words props like
          `onClick = () => {}` can cause re-renders since the function identity
          is not stable
  - [ ] Component has a story in `<ComponentName>.stories.js`
    - [ ] Stories show the intended usage of the component and are examples of
          the most common use-cases
    - [ ] All stories utilize controls
      - [ ] Controls with no meaningful change to the component visuals should
            be hidden from the controls panel, eg. `className`
      - [ ] Props of type `node` with no proper controls available for
            configuration should be hidden from the controls panel, eg.
            `children`
    - [ ] Component has an `.mdx` document that
      - [ ] Follows the established outline
      - [ ] Documents and explains the most common use-cases
      - [ ] Provides a prop table
  - [ ] All required tests are present
    - [ ] Unit/integration tests written with `@testing-library/react` that
          cover the entire component API
      - [ ] Popover's test file is a good example that can be used as a guide
    - [ ] Visual regression tests (VRT) are present in
          `e2e/components/ComponentName/ComponentName-test.e2e.js` that:
      - [ ] Snapshot every storybook story
      - [ ] Snapshot important discrete states (open, selected, enabled,
            autoAlign etc.) by setting controls/args on a story
    - [ ] Accessibility Verification Tests (AVT) are present in
          `e2e/components/ComponentName/ComponentName-test.avt.e2e.js` that:
      - [ ] Ensure every story `.toBeAccessible()`
      - [ ] Ensure important discrete states (open, selected, etc.) are covered
            by arranging/interacting with component before calling
            `.toBeAccessible()`
- [ ] Component is connected with Figma Code Connect and has a
      `<ComponentName>.figma.tsx` file in the code-connect folder.

---

- [ ] Web Component implementation is complete (full details TBD)
  - [ ] ... Various implementation details specific to WC
  - [ ] ... API is documented (ts interface, etc.)
  - [ ] ... Component story(s) are present
  - [ ] ... All required tests are present

---

- [ ] Component styles are available through `@carbon/styles`
  - [ ] Component styles are housed in a `ComponentName/_componentName.scss`
        file
  - [ ] Component styles are defined within a `@mixin`
  - [ ] Component has an entrypoint file `ComponentName/_index.scss` that has at
        minimum:
    - [ ] `@forward 'componentName';`
    - [ ] `@use 'componentName';`
    - [ ] `@include componentName.componentName;`

---

- [ ] React and Web Components implementation mirror one another and have full
      parity
  - [ ] 100% visual parity
  - [ ] 100% functional parity
  - [ ] 100% documentation parity
  - [ ] 100% testing parity

---

- [ ] Misc details are complete
  - [ ] All files have a copyright banner
  - [ ] Component has a label in the GitHub repository
```

--------------------------------

### Add visual fade for overflow content with hasScrollingContent prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.mdx

Set `hasScrollingContent` on `ModalBody` to add a visual fade at the end of the modal body when content overflows. This example uses `size="large"` (note: the documented size is `lg`, but the example uses `large`).

```jsx
<ComposedModal size="large">
  <ModalHeader />
  <ModalBody hasScrollingContent>
    <p className=".cds--modal-content__text">Some very large contents...</p>
  </ModalBody>
</ComposedModal>
```

--------------------------------

### Reference v10 and v11 tokens from compat/theme

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Directly reference tokens from the compat/theme entrypoint, which re-exports all v11 tokens and mixins. Both v10 and v11 tokens can be used together.

```scss
@use '@carbon/styles/scss/compat/theme';

body {
  // You can use both v10 and v11 tokens
  background: theme.$background;
  color: theme.$text-01;
}
```

--------------------------------

### Import @carbon/colors in JavaScript (ESM and CommonJS)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Shows both ESM import and CommonJS require syntax for accessing color exports.

```js
// ESM
import { black, blue, warmGray } from '@carbon/colors';

// CommonJS
const { black, blue, warmGray } = require('@carbon/colors');
```

--------------------------------

### Palette color with alpha token example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/tokens/README.md

Shows a semi-transparent token that reuses colorSpace and components from a palette color via JSON Pointer references and sets its own alpha. The build writes this as rgba(141, 141, 141, 0.12).

```json
"background-hover": {
  "$type": "color",
  "$value": {
    "colorSpace": { "$ref": "#/gray/50/$value/colorSpace" },
    "components": { "$ref": "#/gray/50/$value/components" },
    "alpha": 0.12
  },
  "$description": "Background color for hover state."
}
```

--------------------------------

### DatePicker maxDate prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/__stories__/DatePickerV2.mdx

Limits date selection to any date before the specified date. Dates after the maximum date are disabled in the calendar and navigation is restricted.

```tsx
<DatePicker maxDate="12/31/2024">
  <DatePickerInput id="date" placeholder="mm/dd/yyyy" />
</DatePicker>
```

--------------------------------

### getItems: Get full list of items

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves the complete list of items currently stored in the data manager.

```typescript
const allItems = dataManager.getItems();
```

--------------------------------

### Render Section as article with as prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Heading/Heading.mdx

Use the `as` prop on `Section` to render the outermost node with a specific tag or custom component instead of the default `<section>`. This example renders an `article` element.

```jsx
<Section as="article">
  <Heading>Delivery milestones</Heading>
</Section>
```

--------------------------------

### Import and use theme tokens with @use '@carbon/styles/scss/theme'

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, replace the v10 `@import 'carbon-components/scss/globals/scss/theme';` with `@use '@carbon/styles/scss/theme';` (or `@use '@carbon/react/scss/theme';`). This entry point provides direct access to the current theme and its tokens, such as `$background` and `$text-primary`.

```scss
@use '@carbon/styles/scss/theme';

.example {
  background: theme.$background;
  color: theme.$text-primary;
}
```

--------------------------------

### Create a prefixed build with create-prefixed-build

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

This command generates a copy of the package with all `cds-*` elements renamed, including composites. It is the direct replacement for `es-custom` and works at build time.

```shell
npx -p @carbon/web-components create-prefixed-build --prefix foo --out ./vendor/carbon-foo
```

--------------------------------

### Import using CommonJS

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/pictograms-react/README.md

Import using CommonJS.

```js
const { Airplane } = require('@carbon/pictograms-react');
```

--------------------------------

### Date picker min-date attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Limits date selection to any date after the specified date. Dates before the minimum date are disabled in the calendar and navigation is restricted.

```html
<cds-preview-date-picker min-date="09/15/2025">
  <cds-preview-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"></cds-preview-date-picker-input>
</cds-preview-date-picker>
```

--------------------------------

### NumberInput with percent formatting using formatOptions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/NumberInput/NumberInput.mdx

Use this example to format NumberInput values as percentages when type is set to 'text'. The formatOptions prop follows the Intl.NumberFormat API options, and the value and step are expressed as decimals (0.15 for 15%, 0.05 for 5%).

```jsx
<NumberInput
  type="text"
  value={0.15} // 15%
  step={0.05} // 5%
  formatOptions={{ style: 'percent' }}
/>
```

--------------------------------

### Importing DataTable sort styles in v11

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Import the sort module for DataTable sort styles.

```scss
@use '@carbon/styles/scss/components/data-table/sort';
```

--------------------------------

### Approach 1 - Import path evolution for non-composable migration

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0009-ibm-products-to-core-migration.md

Shows the import path changes for adopters under the selected approach: moving the non-composable component to @carbon/react as stable at v12, then introducing a composable preview and eventually promoting it to stable while deprecating the legacy export.

```plaintext
v11:             import { SidePanel } from '@carbon/ibm-products';
v12:             import { SidePanel } from '@carbon/react';            // moves here — no usage change yet
post-v12:        import { preview__SidePanel } from '@carbon/react';   // new composable version lands as preview
stabilization:   import { deprecated__SidePanel } from '@carbon/react'; // old non-composable export is deprecated
                 import { SidePanel } from '@carbon/react';            // composable version promoted to stable
```

--------------------------------

### Using AI Label in a row

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/data-table/stories/data-table-ai-label.mdx

Pass the `cds-ai-label` component to `cds-table-row` to use it within a row. The example shows the label alongside table cells.

```html
<cds-table-row>
  <cds-ai-label alignment="bottom-left">
    <div slot="body-text">{Content Here}</div>
  </cds-ai-label>
  <cds-table-cell>Load Balancer 1</cds-table-cell>
  <cds-table-cell>HTTP</cds-table-cell>
  ...
</cds-table-row>
```

--------------------------------

### Variable height items default mode

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Example 1: Variable height items in default mode. The container height is set to the smallest item height (200px).

```html
<div id="carousel">
  <div style="height: 200px">Slide 1</div>
  <div style="height: 300px">Slide 2</div>
  <div style="height: 250px">Slide 3</div>
</div>
```

```ts
const carousel = initCarousel(document.getElementById('carousel'));
// Container height will be 200px (smallest item)
```

--------------------------------

### Use font-family function to get a font stack

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Use the font-family function to retrieve a specific font family stack, e.g., 'mono'.

```scss
.my-selector {
  font-family: type.font-family('mono');
}
```

--------------------------------

### Polymorphism with static properties: Access static property from instance

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/coding-conventions.md

Accesses the constructor via an instance to get the static property. Also supports polymorphism.

```typescript
(customElementInstance.constructor as typeof CustomElementClass).staticPropName;
```

--------------------------------

### Access color swatches in JavaScript

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

Each color swatch is exported as a variable, and each color name is also exported as an object that can be called by specifying grade.

```js
black;
blue[50]; // Using the `blue` object.
warmGray100; // Using the `warmGray100` variable.
```

--------------------------------

### Get SVG attributes with getAttributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Use getAttributes to retrieve attributes for an SVG node, such as width and height.

```js
const { getAttributes } = require('@carbon/icon-helpers');
const attributes = getAttributes({ width: 20, height: 20 });
```

--------------------------------

### Use TableToolbarFilter component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DataTable/DataTable.mdx

Import the TableToolbarFilter example component from the Carbon DataTable stories and use it inside TableToolbarContent. Pass the handleTableFilter and handleOnResetFilter functions to its onApplyFilter and onResetFilter props.

```jsx
<TableToolbarFilter
  onApplyFilter={handleTableFilter}
  onResetFilter={handleOnResetFilter}
/>
```

--------------------------------

### BigNumber HTML usage example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/big-number/big-number.mdx

Basic HTML markup for the BigNumber component with fraction-digits, label, value, total, size, and locale attributes.

```html
<c4p-big-number
  fraction-digits="1"
  label="Label"
  value="5"
  total="13"
  size="default"
  locale="en-US">
</c4p-big-number>
```

--------------------------------

### AILabel anatomy with AILabelActions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/AILabel/AILabel.mdx

Shows how to add an action bar at the bottom of the callout by passing AILabelActions as a child of AILabel, placed inside AILabelContent. Includes IconButton and Button examples.

```jsx
<AILabel>
  <AILabelContent>
    {Content Here}
    {Optional AILabel action bar}
    <AILabelActions>
      <IconButton kind="ghost" label="View">
        <View />
      </IconButton>
      <IconButton kind="ghost" label="Open Folder">
        <FolderOpen />
      </IconButton>
      <IconButton kind="ghost" label="Folders">
        <Folders />
      </IconButton>
      <Button>View details</Button>
    </AILabelActions>
  </AILabelContent>
</AILabel>
```

--------------------------------

### Build themes package with yarn build

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/tokens/README.md

Run from the `packages/themes` directory to generate theme maps, component tokens, JavaScript modules, and documentation. Do not edit generated files.

```bash
cd packages/themes
yarn build

```

--------------------------------

### Configure custom theme

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Sets a custom theme by providing a map of token values directly to the theme configuration.

```scss
// Configure with a custom theme
@use '@carbon/styles/scss/theme' with (
  $theme: (
    background: #e2e2e2,
    text-primary: #ffffff,
  )
);
```

--------------------------------

### Rename tag to preview tag

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Replace the v2 tag with the corresponding preview tag in your markup.

```diff
- <cds-text-input name="email" value="[email protected]"></cds-text-input>
+ <cds-preview-text-input name="email" value="[email protected]"></cds-preview-text-input>
```

--------------------------------

### Enable feature flags for entire app in React root

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/FeatureFlags/overview.mdx

Wrap the entire app with FeatureFlags to enable flags globally. This example shows usage with React StrictMode and createRoot.

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FeatureFlags } from '@carbon/react';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <FeatureFlags enableV12TileDefaultIcons>
      <App />
    </FeatureFlags>
  </StrictMode>
);
```

--------------------------------

### OverflowMenu codemod example without wrapping

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after JSX for the OverflowMenu codemod when only API changes are applied (no FeatureFlags wrapping). Converts OverflowMenuItem to MenuItem and maps props accordingly.

```jsx
// Before
<OverflowMenu>
  <OverflowMenuItem itemText="Option 1" />
  <OverflowMenuItem itemText="Delete" isDelete />
</OverflowMenu>

// After
<OverflowMenu>
  <MenuItem label="Option 1" />
  <MenuItem label="Delete" kind="danger" />
</OverflowMenu>
```

--------------------------------

### Compact mode example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/shape-indicator/shape-indicator.mdx

Use the compact attribute to display only the shape with the label shown in a tooltip on hover/focus. This is useful when space is limited or when you want to display multiple indicators in a space-constrained layout.

```html
<cds-shape-indicator kind="failed" label="Failed" compact></cds-shape-indicator>
```

--------------------------------

### CoachmarkOverlayElements HTML structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/coachmark/coachmark-overlay-elements/coachmark-overlay-elements.mdx

HTML markup for the CoachmarkOverlayElements pattern, including a coachmark with beacon trigger, header, body with carousel content, and navigation buttons (Back, Next, Done). Uses properties like `?open`, `align`, `.position`, `.highContrast`, and event handlers like `@c4p-coachmark-beacon-clicked`.

```html
<c4p-coachmark
  ?open=${this._open}
  align=${POPOVER_ALIGNMENT.TOP}
  .position=${{ x: 150, y: 150 }}
  .highContrast=${true}
>
  <c4p-coachmark-beacon
    label="Show information"
    ?expanded=${this._open}
    @c4p-coachmark-beacon-clicked=${this.handleBeaconClick}
    slot="trigger"
  >
  </c4p-coachmark-beacon>
  <c4p-coachmark-header
    closeIconDescription="Close"
  ></c4p-coachmark-header>
  <c4p-coachmark-body class="coachmark-body">
    <div>
      <img
        src=${sampleImage}
        style="width: 100%; margin-bottom: 1rem;"
        alt="Sample"
      />
    </div>

    <div class="exampleCarouselWrapper">
      ${items.map(
        (item) => html`
          <div>
            <h2>${item.title}</h2>
            <p>${item.text}</p>
          </div>
        `
      )}
    </div>
    <div class="carouselControlWrapper__footer">
      <div class="carouselControlWrapper--controls-progress">
        <span class="carousel-progress">${this._currentViewIndex + 1} / ${items.length}</span>
      </div>
      <div class="carouselControlWrapper--buttons">
        ${this.showBack ? html`
          <cds-button
            class="back-btn"
            size="sm"
            kind="ghost"
            @click=${this.handlePrev}
          >
            Back
          </cds-button>
        ` : ''}
        ${this.showNext ? html`
          <cds-button
            class="next-btn"
            size="sm"
            @click=${this.handleNext}
          >
            Next
          </cds-button>
        ` : ''}
        ${this.showDone ? html`
          <cds-button
            class="done-btn"
            size="sm"
            @click=${this.handleClose}
          >
            Done
          </cds-button>
        ` : ''}
      </div>
    </div>
  </c4p-coachmark-body>
</c4p-coachmark>
```

--------------------------------

### Rendering Layer as a section element

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Layer/Layer.mdx

Configures the base element rendered by `Layer` using the `as` prop. In this example, the Layer renders as a `section` element. Any custom component can also be provided to the `as` prop.

```jsx
<Layer as="section">
  <ChildComponent />
</Layer>
```

--------------------------------

### Required SCSS import for Coachmark Tagline

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/coachmark/coachmark-fixed/coachmark-fixed.mdx

Import the coachmark-tagline SCSS file to include required styles for the tagline component. Both JavaScript and SCSS imports are needed.

```scss
@use '@carbon/ibm-products-web-components/scss/components/coachmark/coachmark-tagline/coachmark-tagline.scss';
```

--------------------------------

### Utility directory structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/README.md

Directory layout for adding a new utility, with an index.ts and a utility source file under src/<name>/.

```text
src/
  someUtility/
    index.ts
    someUtility.ts
```

--------------------------------

### getAllDescendantIds: Get all descendant IDs

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves all descendant IDs from an item, including the item itself.

```typescript
const allIds = dataManager.getAllDescendantIds('parent-id');
```

--------------------------------

### Import from package root

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/README.md

Imports a utility from the package root entrypoint, which is part of the public API.

```js
import { utility } from '@carbon/utilities';
```

--------------------------------

### Date picker max-date attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Limits date selection to any date before the specified date. Dates after the maximum date are disabled in the calendar and navigation is restricted.

```html
<cds-preview-date-picker max-date="09/15/2020">
  <cds-preview-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"></cds-preview-date-picker-input>
</cds-preview-date-picker>
```

--------------------------------

### Use withModalPresence higher-order function

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.featureflag.mdx

Wrap your component with the withModalPresence HOC to automatically handle presence and props. The example shows the HOC usage and the resulting component usage.

```jsx
export const MyModal = withModalPresence(
  ({ onSubmit, onClose }) => {
    ...
  },
);

<MyModal open={open} onSubmit={noop} onClose={noop} />
```

--------------------------------

### Edit API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Edit' pattern for the APIKeyModal component. The modal is used to edit an existing API key.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-edit">Edit</button>

<cds-api-key-modal id="api-key-modal-edit" title="Edit API key" description="Edit your API key." editing>
  <cds-text-input label="API key name" value="My API key"></cds-text-input>
</cds-api-key-modal>
```

--------------------------------

### getItemParents: Get all ancestors of a node

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves all ancestors (parents up to the root) of a given node.

```typescript
const ancestors = dataManager.getItemParents('deeply-nested-id');
```

--------------------------------

### Use prettier-config-carbon in prettier.config.js

Source: https://github.com/carbon-design-system/carbon/blob/main/config/prettier-config-carbon/README.md

Create a prettier.config.js file in the root of your project and export the prettier-config-carbon configuration to use it.

```js
'use strict';

const prettierConfig = require('prettier-config-carbon');
module.exports = prettierConfig;
```

--------------------------------

### Example of a hook with a callback in useEffect

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows a useEvent hook implementation where the callback is used directly in a useEffect dependency array, causing the effect to re-run when the callback changes.

```js
function useEvent(element, eventName, callback) {
  // ...

  useEffect(() => {
    element.addEventListener(eventName, callback);
    return () => {
      element.removeEventListener(eventName, callback);
    };
  }, [element, eventName, callback]);

  // ...
}
```

--------------------------------

### Basic Sass test template with SassRenderer

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Use this template to write tests for Sass files. It sets up a Jest environment with node, imports the SassRenderer from @carbon/test-utils/scss, and demonstrates how to render Sass and retrieve values for assertions. The `get` helper returns an object with a `.value` property for JavaScript assertions.

```javascript
/**
 * <COPYRIGHT>
 *
 * @jest-environment node
 */

'use strict';

const { SassRenderer } = require('@carbon/test-utils/scss');

const { render } = SassRenderer.create(__dirname);

describe('@carbon/styles/scss/config', () => {
  test('Public API', async () => {
    const { get } = await render(`
      // You can bring in modules using the path from the test file
      @use '../path/to/sass/module';

      $test: true;

      // The `get` helper will let you pass a value from Sass to JavaScript
      $_: get('test', $test);
    `);

    // get('<key>') gives you both the JavaScript representation of a value
    // along with the `nativeValue` which comes from Dart Sass. Use `.value`
    // to get the JavaScript value and make assertions
    expect(get('test').value).toBe(true);
  });
});

```

--------------------------------

### Configuring Carbon in v11 (config directly)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Alternatively, configure the 'scss/_config.scss' directly. Note: Sass modules can only be configured once, so this should be one of the first things you do.

```scss
@use '@carbon/styles/scss/config' with (
  $prefix: 'cds'
);
```

--------------------------------

### Standalone cds-resizer-handle with manual ARIA management

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Use this HTML and JavaScript when using cds-resizer-handle without a cds-resizer-grid. You must manage ARIA attributes yourself, including updating aria-valuenow and aria-valuetext during resize. The example listens to resize-start and resize-drag events to adjust panel height and keep ARIA in sync.

```html
<div class="container">
  <div class="panel" id="myPanel">Panel content</div>
  <cds-resizer-handle
    aria-valuenow="50"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuetext="Panel height: 200px"></cds-resizer-handle>
</div>

<script>
  const handle = document.querySelector('cds-resizer-handle');
  const panel = document.getElementById('myPanel');
  let initialHeight = 0;

  handle.addEventListener('resize-start', () => {
    initialHeight = panel.offsetHeight;
  });

  handle.addEventListener('resize-drag', (e) => {
    const constrainedHeight = Math.max(48, initialHeight + e.detail.delta);
    panel.style.height = `${constrainedHeight}px`;

    // Keep ARIA in sync
    const percentage = Math.round((constrainedHeight / 400) * 100);
    handle.setAttribute('aria-valuenow', percentage.toString());
    handle.setAttribute(
      'aria-valuetext',
      `Panel height: ${constrainedHeight}px`
    );
  });
</script>
```

--------------------------------

### Build pipeline diagram

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/tokens/README.md

Shows the flow from editing tokens/layout.tokens.json through the style-dictionary build to generated SCSS and JS files, then re-exported via src/index.ts.

```text
tokens/layout.tokens.json     ← you edit this
        │
        ▼  yarn build:tokens
        │  (style-dictionary/sd.config.js)
        │
        ├── scss/generated/*.scss                (Sass variables + maps, one file per token group)
        └── js/generated/layout-tokens.{js,d.ts} (ES module + types)
                │
                ▼
        src/index.ts  re-exports all tokens

```

--------------------------------

### Danger Button Styles Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Shows the three danger button styles: danger, danger-tertiary, and danger-ghost. Use the primary danger style for required destructive actions, and lower emphasis styles for optional destructive actions.

```html
<cds-button kind="danger">Danger</cds-button>
  <cds-button kind="danger-tertiary">Danger tertiary</cds-button>
  <cds-button kind="danger-ghost">Danger ghost</cds-button>
```

--------------------------------

### Use the rgba helper for opacity values

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/colors.md

Imports the rgba helper from '@carbon/colors' and uses it to define a token with opacity. The helper takes a color (e.g., gray100) and a decimal opacity value.

```js
import {
  blue60,
  blue80,
  blue100,
  // ...

  // Include the `rgba` helper
  rgba,
} from '@carbon/colors';

// ...

export const overlay01 = rgba(gray100, 0.5);
```

--------------------------------

### Structured list visible icons codemod example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after JSX for the structured list visible icons codemod. Adds selection to StructuredListRow and removes the conditional CheckmarkFilled icon.

```jsx
// Before
<StructuredListWrapper selection>
  <StructuredListRow>
    <StructuredListCell>Data</StructuredListCell>
    <StructuredListCell>
      {isSelected && <CheckmarkFilled />}
    </StructuredListCell>
  </StructuredListRow>
</StructuredListWrapper>

// After
<StructuredListWrapper selection>
  <StructuredListRow selection>
    <StructuredListCell>Data</StructuredListCell>
  </StructuredListRow>
</StructuredListWrapper>
```

--------------------------------

### Configuring $base-font-size with @use ... with

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/docs/sass.md

Configure the $base-font-size variable when importing the layout package.

```scss
@use '@carbon/layout' with (
  $base-font-size: 18px
);
```

--------------------------------

### Custom footer icon with renderFooterIcon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Card/Card.mdx

Override the default ArrowRight icon using renderFooterIcon. The example uses the Launch icon.

```jsx
<Card
  clickable
  onClick={handleClick}
  renderFooterIcon={Launch}
  aria-label="Launch application">
  ...
</Card>
```

--------------------------------

### Basic grid layout with cds--grid, cds--row, cds--col

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/README.md

Basic grid layout using the primitive classes cds--grid, cds--row, and cds--col to create a 4-column layout.

```html
<div class="cds--grid">
  <div class="cds--row">
    <div class="cds--col">1/4</div>
    <div class="cds--col">1/4</div>
    <div class="cds--col">1/4</div>
    <div class="cds--col">1/4</div>
  </div>
</div>
```

--------------------------------

### Automate size prop changes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Run these two codemods to automate size prop updates in v11. The first migrates the small size prop to size, and the second applies additional size prop updates.

```bash
npx @carbon/upgrade migrate small-to-size-props --write
```

```bash
npx @carbon/upgrade migrate size-prop-updates --write
```

--------------------------------

### Migrate Tooltip to v10 with renderIcon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tooltip/migrate-to-7.x.md

Shows the v10 migration for the Tooltip component: replace the v9 `icon`/`iconName` props with `renderIcon`, which accepts a React component from `@carbon/icons-react`. The example imports the Information16 icon and passes it to `renderIcon`.

```javascript
import Information16 from '@carbon/icons-react/lib/information/16';

...

<Tooltip renderIcon={Information16}>
  My tooltip content...
</Tooltip>
```

--------------------------------

### @carbon/cli --help output

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/cli/README.md

Output of the --help option for @carbon/cli, listing available commands and options.

```bash
Usage: @carbon/cli [options]

Commands:
  cli ci-check              run CI checks
  cli contribute <command>  get started contributing with Carbon
  cli publish <tag>         publish packages that have different versions from
                            the package registry
  cli release [bump]        run the release step for the given version bump

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

--------------------------------

### SassDoc comment with three forward slashes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Example of a SassDoc comment using three forward slashes, with @access annotation.

```scss
/// This is a comment for SassDoc
/// @access public
.#{$prefix}--my-component {
  // ...
}
```

--------------------------------

### Import from @carbon/utilities

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Directly import the carousel SCSS from the @carbon/utilities package.

```scss
@use '@carbon/utilities/scss/carousel';
```

--------------------------------

### Generate with error API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Generate With Error' pattern for the APIKeyModal component. The modal includes an error message displayed when generation fails.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-generate-error">Generate With Error</button>

<cds-api-key-modal id="api-key-modal-generate-error" title="Generate API key" description="Generate a new API key for your application." error-message="Unable to generate API key. Please try again.">
  <cds-text-input label="API key name" placeholder="My API key"></cds-text-input>
</cds-api-key-modal>
```

--------------------------------

### getItemChildren: Get direct children of a node

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves the direct children of a given node by its id.

```typescript
const children = dataManager.getItemChildren('parent-id');
```

--------------------------------

### Inline dropdown with type="inline"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/dropdown/dropdown.mdx

Places the dropdown inline with other content by adding 'type="inline"'. The example includes a label and two options.

```html
<cds-dropdown type="inline" label="Inline" title-text="Label">
  <cds-dropdown-item value="option-1">Option 1</cds-dropdown-item>
  <cds-dropdown-item value="option-2">Option 2</cds-dropdown-item>
</cds-dropdown>
```

--------------------------------

### Stage all changes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Stage all modified files for commit after running release commands.

```bash
git add .
```

--------------------------------

### AI Label with ai-text-label attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Use the ai-text-label attribute with the inline variant to add adjacent text. The second example shows the inline variant without the attribute.

```html
<cds-ai-label kind="inline" ai-text-label="Text goes here">
  <div slot="body-text">Explanation of AI-generated content</div>
</cds-ai-label>

<cds-ai-label kind="inline">
  <div slot="body-text">Explanation of AI-generated content</div>
</cds-ai-label>
```

--------------------------------

### Import from top-level module

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities-react/README.md

Imports a utility from a top-level module with a src/<name>/index.* file.

```js
import { utility } from '@carbon/utilities-react/utility';
```

--------------------------------

### Flatten a region with inline styles and HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Apply --cds-button-radius via inline style on a div to affect descendant buttons. Includes an icon button example.

```html
<div style="--cds-button-radius: 0">
  <cds-button>Save</cds-button>
</div>

<div style="--cds-button-radius: 0.25rem">
  <cds-button tooltip-text="Add">
    <svg
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      slot="icon"
      width="16"
      height="16"
      viewBox="0 0 32 32"
      aria-hidden="true">
      <path
        d="M17 15 17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
    </svg>
  </cds-button>
</div>
```

--------------------------------

### DatePicker appendTo prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Attaches the DatePicker menu to a specified DOM element instead of the body. The node is obtained via document.querySelector and passed to the appendTo prop.

```jsx
const node = document.querySelector('#my-node');

<DatePicker appendTo={node}>...</DatePicker>;
```

--------------------------------

### getItemDescendants: Get all descendants of a node

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves all descendant items (children, grandchildren, etc.) of a given node.

```typescript
const descendants = dataManager.getItemDescendants('parent-id');
```

--------------------------------

### getItemParent: Get parent of a node

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves the parent of a given node. Returns undefined if the node has no parent.

```typescript
const parent = dataManager.getItemParent('child-id');
```

--------------------------------

### getSelectedItems: Get selected items

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Returns an array of items marked as selected. This method is memoized for performance.

```typescript
const selected = dataManager.getSelectedItems();
```

--------------------------------

### Import and use @carbon/grid with css-grid mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Import the @carbon/grid package and emit all CSS for the CSS Grid by including the css-grid mixin.

```scss
@use '@carbon/grid';

// Emit all the CSS for the CSS Grid
@include grid.css-grid();
```

--------------------------------

### Component folder structure for packages/web-components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/AGENTS.md

Shows the required file layout for a web component in packages/web-components/src/components/. Each file has a specific role: index.ts for re-exports, component-name.ts for the main component, SCSS files for styling, Storybook files for stories and docs, and a test file under __tests__.

```text
component-name/
├── index.ts                   // Re-exports
├── component-name.ts          // Main component
├── component-name.scss        // Web-component-specific styling
├── component-name.stories.ts  // Storybook stories
├── component-name-story.scss  // Styling for storybook stories
├── component-name.mdx         // Storybook mdx docs
└── __tests__/
│   └── component-name-test.ts // Unit tests
```

--------------------------------

### Date picker with min-date attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/date-picker.mdx

Use the `min-date` attribute on `cds-date-picker` to limit date selection to any date after the specified date. The example sets `min-date="09/15/2025"`.

```html
<cds-date-picker min-date="09/15/2025">
  <cds-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"></cds-date-picker-input>
</cds-date-picker>
```

--------------------------------

### Preview export naming with `preview_` prefix

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/preview-code.md

Shows how preview exports are named with the `preview_` prefix, including a method, variable, and component export. The component retains its original name internally but is exported with the prefix.

```js
// A preview method
function preview_layout() {
  // ...
}

// A preview variable
const preview_meta = {
  // ...
};

// A preview component will retain its name, specifically for things like
// the rules of hooks plugin which depend on the correct casing of the name
function ComponentName(props) {
  // ...
}

// However, when we export the component we will export it with the `preview_`
// prefix.
export { ComponentName as preview_ComponentName } from './components/ComponentName';
```

--------------------------------

### Import Carbon styles with custom prefix using @use with

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

When overriding project settings like $prefix, pass them into the with block of the @use import. This is the recommended way to configure Carbon in v11.

```scss
@use '@carbon/styles' with (
  $prefix: 'cds'
);
```

--------------------------------

### Disable content switcher items with disabled attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/content-switcher/content-switcher.mdx

Add the 'disabled' attribute to 'cds-content-switcher-item' elements to disable them. The example shows three disabled items with different values and names.

```html
<cds-content-switcher>
  <cds-content-switcher-item disabled value="all" name="one">
    First section
  </cds-content-switcher-item>
  <cds-content-switcher-item disabled value="cloudFoundry" name="two">
    Second section
  </cds-content-switcher-item>
  <cds-content-switcher-item disabled value="staging" name="three">
    Third section
  </cds-content-switcher-item>
</cds-content-switcher>
```

--------------------------------

### After: Using size prop with single Add icon

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v11 pattern of importing a single Add icon and specifying the size via the size prop. The default size is used when no size prop is provided.

```jsx
import { Add } from '@carbon/icons-react';

function MyComponent() {
  return (
    <>
      <Add size={32} />
      <Add size={24} />
      <Add size={20} />
      <Add />
    </>
  );
}
```

--------------------------------

### Icon button tooltip-position examples

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Shows four icon-only buttons with the tooltip-position attribute set to top, right, bottom, and left. The default position is top. Use this to control where the tooltip appears relative to the icon button.

```html
<cds-button tooltip-text="Add" kind="primary" tooltip-position="top">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
<cds-button tooltip-text="Add" kind="primary" tooltip-position="right">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
<cds-button tooltip-text="Add" kind="primary" tooltip-position="bottom">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
<cds-button tooltip-text="Add" kind="primary" tooltip-position="left">
  <svg
    focusable="false"
    preserveAspectRatio="xMidYMid meet"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 32 32"
    slot="icon">
    <path
      d="M17 15L17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"></path>
  </svg>
</cds-button>
```

--------------------------------

### Custom generate API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Custom Generate' pattern for the APIKeyModal component. The modal is customized with a custom generate button and includes JavaScript to set the editing state.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-custom-generate">Custom Generate</button>

<cds-api-key-modal id="api-key-modal-custom-generate" title="Generate API key" description="Generate a new API key for your application.">
  <cds-text-input label="API key name" placeholder="My API key"></cds-text-input>
  <cds-button slot="footer" kind="primary">Generate</cds-button>
</cds-api-key-modal>

<script>
  const el = document.getElementById('customGenerate');
  el.editing = true;
</script>
```

--------------------------------

### cds-selectable-tile (legacy) minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for a selectable tile using legacy 'bx--' classes with minimum attributes. The input is a checkbox with tabindex '-1'.

```html
<input
  class="bx--tile-input"
  id="input"
  tabindex="-1"
  type="checkbox"
>
<label
  class="bx--tile bx--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="bx--tile__checkmark">
  </div>
  <div class="bx--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### JavaScript: Import component tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Import per-component token sets. Note: prior to 11.78.0 these were double-nested (e.g., buttonTokens.buttonTokens); the repeated property is now undefined.

```js
import {
  buttonTokens,
  tagTokens,
  notificationTokens,
  statusTokens,
  contentSwitcherTokens,
} from '@carbon/themes';
```

--------------------------------

### InterstitialScreen usage example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Basic usage of the InterstitialScreen component with Header, Body, and Footer subcomponents. The Body uses a contentRenderer function to render multiple InterstitialScreenView steps. The Footer labels are customizable via props.

```jsx
<InterstitialScreen open >
  <InterstitialScreen.Header
    headerTitle={'headerTitle'}
    headerSubTitle={'headerSubTitle'}
  ></InterstitialScreen.Header>
  <InterstitialScreen.Body
    contentRenderer={(internalConfig) => {
      return (
        <InterstitialScreenView
          className="NoImageExampleModal"
          stepTitle="Step 1"
        >
          Step 1 content
        </InterstitialScreenView>
         <InterstitialScreenView
          className="NoImageExampleModal"
          stepTitle="Step 2"
        >
          Step 2 content
        </InterstitialScreenView>
      );
    }}
  />
  <InterstitialScreen.Footer
    nextButtonLabel="Next"
    previousButtonLabel="Back"
    skipButtonLabel="Skip"
    startButtonLabel="Get started"
  />
</InterstitialScreen>
```

--------------------------------

### TruncatedText HTML usage with tooltip type

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/truncated-text/truncated-text.mdx

Example of using the cds-truncated-text element with the tooltip type, specifying the text value and number of lines to display before truncation.

```html
<cds-truncated-text
  value="Buttons are used to initialize an action, either in the background or foreground of an experience. There are several kinds of buttons. Primary buttons should be used for the principal call to action on the page. Secondary buttons should be used for secondary actions on each page. Danger buttons should be used for a negative action (such as Delete) on the page. Modify the behavior of the button by changing its event properties. Small buttons may be used when there is not enough space for a regular-sized button. This issue is most often found in tables. Small buttons should have three words or fewer."
  lines="2"
  type="tooltip"></cds-truncated-text>
```

--------------------------------

### DatePicker value

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

By default `DatePicker` will set the current date as its value. You can pass in a date string or date object to start at a different date.

```APIDOC
## DatePicker value

### Description
By default `DatePicker` will set the current date as its value. You can pass in a date string or date object to start at a different date.

### Props
- **value** (string | Date) - Optional - The initial date value.

### Example
```jsx
<DatePicker datePickerType="single" value="07/15/1988">
  <DatePickerInput
    placeholder="dd/mm/yyyy"
    id="date-picker-6"
    labelText="Value as string example"
  />
</DatePicker>
<br />
<DatePicker datePickerType="single" value={new Date()}>
  <DatePickerInput
    placeholder="dd/mm/yyyy"
    id="date-picker-7"
    labelText="Value as object example"
  />
</DatePicker>
```
```

--------------------------------

### Customize Action Buttons in CreateFullPage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateFullPage/CreateFullPage.mdx

Modify the ActionSet component to change button labels or add custom buttons. This example shows how to set custom text for the submit, next, back, and cancel buttons.

```jsx
<CreateFullPage
  submitButtonText="Create Resource"
  nextButtonText="Continue"
  backButtonText="Previous"
  cancelButtonText="Cancel"
>
  {/* Steps */}
</CreateFullPage>
```

--------------------------------

### Import bundled Sass entrypoint and nested package

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Imports the bundled Sass entrypoint and a nested package like @carbon/themes.

```scss
@import '@carbon/elements/scss/elements';

# Import a specific package nested in elements
@import '@carbon/elements/scss/themes/g10';
```

--------------------------------

### Import specific Carbon components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Import individual components to include only the styles you need.

```scss
@use '@carbon/styles/scss/reset';
@use '@carbon/styles/scss/components/accordion';
@use '@carbon/styles/scss/components/button';
@use '@carbon/styles/scss/components/checkbox';
```

--------------------------------

### Empty default option

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/FluidSelect/FluidSelect.mdx

Make the first child of FluidSelect a SelectItem with empty text and value props to get a default empty selection.

```jsx
<FluidSelect
  id={`select-1`}
  labelText="Select an option"
  helperText="Optional helper text">
  <SelectItem value="" text="" />
  <SelectItem value="option-1" text="Option 1" />
  <SelectItem value="option-2" text="Option 2" />
</FluidSelect>
```

--------------------------------

### Import module Sass entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Imports the module Sass entrypoint for projects with configured @import resolution.

```scss
@import '@carbon/elements/scss/index';
```

--------------------------------

### ModalStateManager with launcher button and portal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.mdx

Example of opening/closing a modal by changing the `open` prop. Uses a React state and a `<Button>` to toggle the modal, rendering it via a portal to `document.body`. Note that `Modal` and `ComposedModal` must be at the top level in the React tree, so a portal is recommended.

```jsx
function ModalStateManager() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {typeof document === 'undefined'
        ? null
        : ReactDOM.createPortal(
            <ComposedModal open={open} onClose={() => setOpen(false)}>
              ...
            </ComposedModal>,
            document.body
          )}
      <Button kind="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
    </>
  );
}
```

--------------------------------

### Load IBM Plex Sans via unpkg @font-face

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Quickly load IBM Plex Sans from unpkg CDN when the default Akamai CDN is not working. Use the URL pattern from the @ibm/plex package.

```css
@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 400;
  src: url('//unpkg.com/@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2')
    format('woff2');
}
```

--------------------------------

### Import from @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Import the Carbon utilities SCSS from the @carbon/react package for React applications.

```scss
@use '@carbon/react/scss/_carbon-utilities.scss';
```

--------------------------------

### GenerateAnAPIKey component usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/GenerateAnAPIKey/GenerateAnAPIKey.mdx

Example JSX for the GenerateAnAPIKey component, showing conditional rendering of the generated key display and the input form. Includes PasswordInput, TextInput, and messaging elements.

```html
<GenerateAnAPIKey
  open={open}
  onRequestClose={toggleModal}
  primaryButtonDisabled={loading || name.length === 0}
  secondaryButtonText="Close"
  {...modalProps}
>
  {key ? (
    <>
      <PasswordInput
        id="generated-api-key"
        labelText="Unique API key"
        value={key}
        readOnly
        showPasswordLabel="Show key"
        hidePasswordLabel="Hide key"
        tooltipPosition="left"
        helperText="This is your unique API key and is non-recoverable. If you lose this API key, you will have to reset it."
      />
      <div className={`${blockClass}__messaging`}>
        <InformationFilled size={16} />
        <APIKeyDownloader
          apiKey={key}
          body="This is your unique API key and is non-recoverable. If you lose this API key, you will have to reset it."
          fileName="apikey"
          linkText="Download as JSON"
          fileType="json"
          downloadLinkLabel="Download API Key in Java Script File format"
        />
      </div>
      <div className={`${blockClass}__messaging`}>
        <CheckmarkFilled
          size={20}
          className={`${blockClass}__checkmark-icon`}
        />
        <p
          className={`${blockClass}__messaging-text`}
          role="alert"
          aria-live="assertive"
        >
          API key successfully created
        </p>
      </div>
    </>
  ) : (
    <>
      <p style={{ marginBlockEnd: '1rem' }}>
        (Optional description text) To connect securely to [product name],
        your application or tool needs an API key with permission to
        access resources such as [product resource name].
      </p>
      <TextInput
        id="app-name"
        labelText="Name your application"
        placeholder="Application name"
        value={name}
        onChange={handleName}
        disabled={loading}
        helperText="Providing the application name will help you identify your API key later."
      />
    </>
  )}
</GenerateAnAPIKey>
```

--------------------------------

### Import Grid and Column from @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/Grid.mdx

Import the Grid and Column components from the @carbon/react package to build layouts using Carbon's 2x Grid system.

```js
import { Grid, Column } from '@carbon/react';
```

--------------------------------

### Synchronized TreeView with Feature Flag

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/TreeView/TreeView.featureflag.mdx

Example of using the new controllable API of TreeView with the `enable-treeview-controllable` feature flag. It synchronizes `selected` and `active` state with the application by passing state and setter functions to `TreeView`.

```jsx
function SynchronizedTreeView() {
  const [selected, setSelected] = useState([]);
  const [active, setActive] = useState(null);

  return (
    <FeatureFlags enableTreeViewControllable>
      <TreeView
        selected={selected}
        onSelect={setSelected}
        active={active}
        onActivate={setActive}>
        ...
      </TreeView>
    </FeatureFlags>
  );
}
```

--------------------------------

### OverflowMenu codemod example with wrapping

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after JSX for the OverflowMenu codemod when wrapping with FeatureFlags is enabled. Converts OverflowMenuItem to MenuItem, maps itemText to label and isDelete to kind="danger", and wraps with FeatureFlags.

```jsx
// Before
<OverflowMenu>
  <OverflowMenuItem itemText="Option 1" />
  <OverflowMenuItem itemText="Delete" isDelete />
</OverflowMenu>

// After
<FeatureFlags enableV12Overflowmenu>
  <OverflowMenu>
    <MenuItem label="Option 1" />
    <MenuItem label="Delete" kind="danger" />
  </OverflowMenu>
</FeatureFlags>
```

--------------------------------

### Run codemod to rewrite icon imports from @carbon/icons-react to @carbon/react/icons

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Run this codemod after the icons-react-size-prop codemod. It updates imports from @carbon/icons-react to @carbon/react/icons.

```bash
npx @carbon/upgrade migrate update-carbon-icons-react-import-to-carbon-react --write
```

--------------------------------

### Checkbox onChange Prop Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Checkbox/Checkbox.mdx

Use the onChange prop to pass a custom function for event handling. The function receives three arguments: a boolean, the checkbox id, and the DOM event.

```jsx
<Checkbox onChange={()=>{}} labelText={`Checkbox label`} id="checkbox-label-1" />
<Checkbox onChange={()=>{}} labelText={`Checkbox label`} id="checkbox-label-2" />
```

--------------------------------

### v10 OverflowMenu with renderIcon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/OverflowMenu/migrate-to-7.x.md

Example of using OverflowMenu in v10 with the renderIcon prop, which takes a React component from @carbon/icons-react. The floatingMenu prop is removed and the menu always works as a floating menu.

```javascript
import OverflowMenuVertical16 from '@carbon/icons-react/lib/overflow-menu--vertical/16';

...

<OverflowMenu renderIcon={OverflowMenuVertical16}>
  <OverflowMenuItem itemText="Option 1" />
  <OverflowMenuItem itemText="Option 2" />
  ...
</OverflowMenu>
```

--------------------------------

### Dropdown with direction="top"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/dropdown/dropdown.mdx

Renders the dropdown menu to the top of the screen, which is useful when the dropdown is near the bottom of the page. The example shows a dropdown with label 'Select an option...' and three items.

```html
<cds-dropdown direction="top" label="Select an option...">
  <cds-dropdown-item value="0">Option 1</cds-dropdown-item>
  <cds-dropdown-item value="1">Option 2</cds-dropdown-item>
  <cds-dropdown-item value="2">Option 3</cds-dropdown-item>
</cds-dropdown>
```

--------------------------------

### Enable feature flag with feature-flags component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/feature-flags/overview.mdx

Wrap a component with the feature-flags component to enable a feature flag. Multiple flags can be configured at once, and each component that wants the flag must be wrapped. The example enables the enable-v12-toggle-reduced-label-spacing flag on a cds-toggle component.

```html
import '@carbon/web-components/es/components/feature-flags/feature-flags.js';

<feature-flags enable-v12-toggle-reduced-label-spacing>
  <cds-toggle
    label-text="Label"
    label-a="Off"
    label-b="On"
    toggled></cds-toggle>
</feature-flags>
```

--------------------------------

### CSS Grid Setup for Page Header Hero Image

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/page-header/page-header.mdx

Required to enable CSS grid styles for the hero image layout. Must be included before using the grid classes in the HTML.

```css
@use '@carbon/grid';

// Emit css-grid styles
@include grid.css-grid();
```

--------------------------------

### Tag and push release

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Create an annotated tag for the release and push it to upstream. Ensure the tag version matches the intended release.

```bash
git tag -a vX.Y.Z -m 'vX.Y.Z'
```

```bash
git push upstream vX.Y.Z
```

--------------------------------

### Add component-specific tokens for button, notification, tag, content-switcher

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/styling.md

Some components (button, notification, tag, content switcher) have specific tokens per theme that need to be emitted. This example imports and adds those component tokens using `theme.add-component-tokens`.

```scss
@use '@carbon/styles/scss/reset';
@use '@carbon/styles/scss/theme';
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/components/button/tokens' as button-tokens;
@use '@carbon/styles/scss/components/notification/tokens' as notification-tokens;
@use '@carbon/styles/scss/components/tag/tokens' as tag-tokens;
@use '@carbon/styles/scss/components/content-switcher/tokens' as
  content-switcher-tokens;
@include theme.add-component-tokens(button-tokens.$button-tokens);
@include theme.add-component-tokens(notification-tokens.$notification-tokens);
@include theme.add-component-tokens(tag-tokens.$tag-tokens);
@include theme.add-component-tokens(
  content-switcher-tokens.$content-switcher-tokens
);
```

--------------------------------

### Variable height items max height mode

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Example 2: Variable height items in max height mode. The container height is set to the largest item height (300px).

```ts
const carousel = initCarousel(document.getElementById('carousel'), {
  useMaxHeight: true,
});
// Container height will be 300px (largest item)
```

--------------------------------

### Initialize createOverflowHandler with Lit

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/overflowHandler/README.md

Initializes the overflow handler with a container, maxVisibleItems, onChange callback, and dimension. The handler adds data-hidden attributes to overflowing items and calls onChange with visible and hidden nodes. The example includes a Lit template with buttons and CSS to hide hidden items.

```ts
// App.ts
import { html } from 'lit';
import { createOverflowHandler } from '@carbon/utilities';

let handler;

const initializeHandler = () => {
  if (handler) {
    console.log('Handler found. Removing and re-initiating...');
    document.removeEventListener('DOMContentLoaded', initializeHandler);
    handler.disconnect();
    return;
  }

  // initiate the handler only when the DOM settles and is stable, so that the items are at the correct dimensions before initialization.
  requestAnimationFrame(() => {
    handler = createOverflowHandler({
      container: document.querySelector('#visible-items'),
      maxVisibleItems: 5,
      onChange: (visibleItems, hiddenItems) => {
        console.log(visibleItems, hiddenItems);
      },
      dimension: 'width',
    });
  });
};

document.addEventListener('DOMContentLoaded', initializeHandler);

return html`
  <style>
    /* Scope if necessary */
    [data-hidden]:not([data-fixed]) {
      display: none;
    }
  </style>
  <div id="visible-items">
    <button>button 1</button>
    <button>button 2</button>
    <button>button 3</button>
    <button>button 4</button>
    <button>button 5</button>
    <button>button 6</button>
  </div>
`;
```

--------------------------------

### Enable chmod/chown on /mnt/c

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Enable chmod/chown functionality on the /mnt/c mount to allow git clone operations from WSL.

```bash
sudo umount /mnt/c
```

```bash
sudo mount -t drvfs C: /mnt/c -o metadata
```

--------------------------------

### Test or Update Web Components Snapshots

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run from the packages/web-components directory to test or update snapshots for web components.

```bash
yarn test
```

```bash
yarn test:updateSnapshots
```

--------------------------------

### Style cds-edit-in-place CSS parts

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/edit-in-place/edit-in-place.mdx

Use this CSS to style the input, actions container, and invalid-text container of the cds-edit-in-place component via its exposed CSS parts. The example sets font-weight, background-color, and font-style respectively.

```css
cds-edit-in-place::part(input) {
  font-weight: bold;
}

cds-edit-in-place::part(actions) {
  background-color: lightgray;
}

cds-edit-in-place::part(invalid-text) {
  font-style: italic;
}
```

--------------------------------

### Edit with error API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Edit With Error' pattern for the APIKeyModal component. The modal includes an error message displayed when editing fails.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-edit-error">Edit With Error</button>

<cds-api-key-modal id="api-key-modal-edit-error" title="Edit API key" description="Edit your API key." editing error-message="Unable to edit API key. Please try again.">
  <cds-text-input label="API key name" value="My API key"></cds-text-input>
</cds-api-key-modal>
```

--------------------------------

### usePrefix with classnames

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/internal/usePrefix.mdx

Use usePrefix with classnames to construct a class name with the current prefix.

```js
import { usePrefix } from '@carbon/react';
import { cx } from 'classnames';

function ExampleComponent() {
  const prefix = usePrefix();
  const className = cx(`${prefix}--custom-component`);
}
```

--------------------------------

### Create release branch

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Create a new branch for the release version, e.g., release/vX.Y.Z.

```bash
git checkout -b `release/vX.Y.Z`
```

--------------------------------

### Add Custom Header Content to CreateFullPage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateFullPage/CreateFullPage.mdx

Modify the SimpleHeader component or pass custom breadcrumbs to the CreateFullPage pattern. This example shows how to set a custom page title, breadcrumbs with a current page indicator, and breadcrumb overflow tooltip alignment.

```jsx
<CreateFullPage
  title="Custom Page Title"
  breadcrumbs={[
    { key: '0', label: 'Home', href: '/' },
    { key: '1', label: 'Resources', href: '/resources' },
    { key: '2', label: 'Create', isCurrentPage: true },
  ]}
  maxVisibleBreadcrumbs={3}
  breadcrumbOverflowTooltipAlign="right"
>
  {/* Steps */}
</CreateFullPage>
```

--------------------------------

### Accordion align prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

Use the align prop to specify the side where the icon should be placed in the accordion. This prop must not be used to create a tree view or set of nested accordions.

```jsx
<Accordion align="start">
  <AccordionItem title="Panel A">Panel A</AccordionItem>
  <AccordionItem title="Panel B">Panel B</AccordionItem>
  <AccordionItem title="Panel C">Panel C</AccordionItem>
</Accordion>
```

--------------------------------

### State Machine Tests for DatePickerStateMachine

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Tests for the DatePickerStateMachine covering transitions from IDLE to FOCUSED on INPUT_FOCUS and range selection flow. Verifies state changes and context updates for start and end dates.

```typescript
import {
  DatePickerStateMachine,
  DatePickerState,
  DatePickerEvent,
} from './state-machine';

describe('DatePickerStateMachine', () => {
  it('should transition from IDLE to FOCUSED on INPUT_FOCUS', () => {
    const machine = new DatePickerStateMachine();

    expect(machine.getState()).toBe(DatePickerState.IDLE);

    machine.send(DatePickerEvent.INPUT_FOCUS);

    expect(machine.getState()).toBe(DatePickerState.FOCUSED);
    expect(machine.getContext().isFocused).toBe(true);
  });

  it('should handle range selection correctly', () => {
    const machine = new DatePickerStateMachine({ mode: 'range' });

    machine.send(DatePickerEvent.CALENDAR_OPEN);
    machine.send(DatePickerEvent.RANGE_START_SELECT, {
      date: new Date('2024-01-15'),
    });

    expect(machine.getState()).toBe(DatePickerState.SELECTING_END);

    machine.send(DatePickerEvent.RANGE_END_SELECT, {
      date: new Date('2024-01-20'),
    });

    expect(machine.getState()).toBe(DatePickerState.DATE_SELECTED);

    const context = machine.getContext();
    expect(context.startDate).toEqual(new Date('2024-01-15'));
    expect(context.endDate).toEqual(new Date('2024-01-20'));
  });
});
```

--------------------------------

### Author component styles using mixins

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Wrap component styles in a Sass mixin to control CSS emission. The example shows an accordion mixin with a private access modifier and group annotation.

```scss
// src/components/accordion/_accordion.scss

/// Accordion
/// @access private
/// @group accordion
@mixin accordion {
  .#{$prefix}--accordion {
    // ...
  }
}
```

--------------------------------

### Run codemod for icons-react size prop migration

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Command to run the automated codemod from @carbon/upgrade that updates imports and size usage for @carbon/icons-react. Use --write to apply changes.

```bash
npx @carbon/upgrade migrate icons-react-size-prop --write
```

--------------------------------

### getItemStatus: Get selected state status

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Retrieves the selected state status of an item. Status can be 'checked', 'unchecked', or 'indeterminate'.

```typescript
const status = dataManager.getItemStatus('1');
```

--------------------------------

### Publish code connect with token

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/code-connect/README.md

Publishes all Code Connect configurations using a Figma access token.

```sh
npx figma connect publish --token <token>
```

--------------------------------

### Migrate TableToolbarAction to renderIcon with @carbon/icons-react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DataTable/migrate-to-7.x.md

Shows the v7 migration for TableToolbarAction: replace the icon and iconName props with renderIcon, which takes a React component from @carbon/icons-react. The example imports Download16 and passes it to renderIcon.

```javascript
import Download16 from '@carbon/icons-react/lib/download/16';

...

<TableToolbarAction renderIcon={Download16} />
```

--------------------------------

### Date picker range with kind="from" and kind="to"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/date-picker.mdx

For a range date picker, provide two `cds-date-picker-input` children with `kind` attributes set to `from` and `to`, corresponding to the start and end dates of the range.

```html
<cds-date-picker>
  <cds-date-picker-input
    kind="from"
    label-text="Start date"
    placeholder="mm/dd/yyyy">
  </cds-date-picker-input>
  <cds-date-picker-input
    kind="to"
    label-text="End date"
    placeholder="mm/dd/yyyy">
  </cds-date-picker-input>
</cds-date-picker>
```

--------------------------------

### Date picker with date-format attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/date-picker.mdx

Use the `date-format` attribute on `cds-date-picker` to change how the selected date is displayed in the input. The example uses the format `Y-m-d` (e.g., 2025-04-17). Supported tokens are listed in the Flatpickr documentation.

```html
<cds-date-picker date-format="Y-m-d">
  <cds-date-picker-input
    kind="single"
    placeholder="yyyy/mm/dd"></cds-date-picker-input>
</cds-date-picker>
```

--------------------------------

### Config file path for component code connect

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/code-connect/README.md

Shows the location of Code Connect config files for each component within the react package.

```sh
"packages/src/react/code-connect/ComponentName/ComponentName.figma.tsx"
```

--------------------------------

### Feature commit diff example

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Shows a diff for a feature commit that extends an existing API by adding a new prop to a component. The diff highlights the addition of propB to the function signature.

```diff
// Adding new functionality to a piece of code is considered a feature.
// This can be seen as extending an existing API
-function MyComponent({ propA }) {
+function MyComponent({ propA, propB }) {
  // ...
}
```

--------------------------------

### Run unstable-pagination-to-pagination codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Executes the `unstable-pagination-to-pagination` codemod via npx. This codemod migrates `unstable_Pagination` / `preview_Pagination` to the stable `Pagination` component, dropping `PageSelector` imports and children render-props.

```bash
npx @carbon/upgrade migrate unstable-pagination-to-pagination --write
```

--------------------------------

### Run light-to-layer codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Executes the `refactor-light-to-layer` codemod via npx. This codemod finds components with the `light` prop, removes it, wraps the component with `<Layer>`, and adds the necessary Layer import.

```bash
npx @carbon/upgrade migrate refactor-light-to-layer --write
```

--------------------------------

### Conditional rendering with aFeatureFlag

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/internal/README.md

Import aFeatureFlag from the FeatureFlags module and use it in a ternary to render 'foo' when the flag is true, otherwise render 'bar'. The example shows a React component that spreads props onto a div.

```javascript
import { aFeatureFlag } from '/path/to/FeatureFlags';
...
const MyComponent = props => (<div {...props}>{aFeatureFlag ? 'foo' : 'bar'}</div>);
```

--------------------------------

### FeatureFlags flags prop to individual boolean props migration example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Shows the before and after of migrating the `FeatureFlags` component from using the `flags` object to individual boolean props. The `flags` object is replaced with a boolean prop named after the flag, with `enable-v12-tile-default-icons` becoming `enableV12TileDefaultIcons`.

```jsx
// Before
<FeatureFlags flags={{ 'enable-v12-tile-default-icons': true }}>
  <App />
</FeatureFlags>

// After
<FeatureFlags enableV12TileDefaultIcons>
  <App />
</FeatureFlags>
```

--------------------------------

### Import a prefixed build component

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

After creating a prefixed build, import the component from the generated directory. This registers the element with the custom prefix.

```javascript
// registers <foo-button>
import './vendor/carbon-foo/components/button/index.js';
```

--------------------------------

### Sass $colors map structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/README.md

The $colors map contains swatch names as keys, each mapping to a map of grades to hex values.

```scss
$colors: (
  'blue': (
    10: #edf4ff,
    // ...
  )
);
```

--------------------------------

### Action: RANGE_END_SELECT Context Update

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

An action that updates the context when a range end is selected, swapping dates if the end date is before the start date. Returns the new startDate, endDate, and formatted value.

```typescript
// Example: Update context when range end is selected
{
  RANGE_END_SELECT: (context, event) => {
    const endDate = event.payload?.date;
    const { startDate } = context;

    // Swap if needed
    if (endDate < startDate) {
      return {
        startDate: endDate,
        endDate: startDate,
        value: `${formatDate(endDate)}/${formatDate(startDate)}`,
      };
    }

    return {
      endDate,
      value: `${formatDate(startDate)}/${formatDate(endDate)}`,
    };
  };
}
```

--------------------------------

### Custom edit API key modal pattern

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/example/index.html

Shows the 'Custom Edit' pattern for the APIKeyModal component. The modal is customized with a custom edit button and includes JavaScript to set the editing state.

```html
<button class="cds--btn cds--btn--primary" data-modal-target="#api-key-modal-custom-edit">Custom Edit</button>

<cds-api-key-modal id="api-key-modal-custom-edit" title="Edit API key" description="Edit your API key." editing>
  <cds-text-input label="API key name" value="My API key"></cds-text-input>
  <cds-button slot="footer" kind="primary">Edit</cds-button>
</cds-api-key-modal>

<script>
  const el = document.getElementById('customEdit');
  el.editing = true;
</script>
```

--------------------------------

### Importing DataTable in v11 (base)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, DataTable styles are split into modules. Import the base module and additional modules for actions, expandable, skeleton, and sort as needed.

```scss
@use '@carbon/styles/scss/components/data-table';
```

--------------------------------

### Run wc-report-non-barrel-imports codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Reports class file imports that need a barrel. Only reports; run first to see scope. Stops if working tree is dirty unless --force is passed.

```sh
npx @carbon/upgrade migrate wc-report-non-barrel-imports
```

--------------------------------

### After: IconButton replacement for TooltipIcon

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v11 replacement for TooltipIcon using IconButton. The tooltipText prop is renamed to label, and renderIcon is replaced by the child content.

```jsx
import { IconButton } from '@carbon/react';

function ExampleComponent() {
  return (
    <IconButton
      label="Example tooltip"
      onClick={() => {
        // ...
      }}>
      <Filter />
    </IconButton>
  );
}
```

--------------------------------

### Custom footer buttons in CreateTearsheet.tsx

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/CreateTearsheet.mdx

Modify the footer section in CreateTearsheet.tsx to add custom buttons. The example includes a ghost 'Save Draft' button, a secondary 'Back' button, and a primary 'Next' button.

```jsx
<Tearsheet.Footer>
  <ButtonSet>
    {/* Add your custom buttons */}
    <Button kind="ghost">Save Draft</Button>
    <Button kind="secondary" onClick={handlePrevious}>
      Back
    </Button>
    <Button onClick={handleNext}>Next</Button>
  </ButtonSet>
</Tearsheet.Footer>
```

--------------------------------

### Bug fix commit diff example

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Shows a diff for a bug fix commit that corrects a fault in existing code by changing the subtraction to addition in the add function.

```diff
// Updating an implementation to correct a fault in the existing code is
// considered a bug fix
function add(a, b) {
-  return a - b;
+  return a + b;
}
```

--------------------------------

### Import resizer component (JavaScript)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Import the resizer web component module to enable custom element registration. Required before using any resizer components in JavaScript.

```javascript
import '@carbon/web-components/es/components/resizer/index.js';
```

--------------------------------

### Configure @carbon/styles to use flexbox grid

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Configures the package to emit a flexbox-based grid instead of the default CSS Grid by setting $use-flexbox-grid to true.

```scss
@use '@carbon/styles' with (
  $use-flexbox-grid: true
);
```

--------------------------------

### cds-add-select usage example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/add-select/README.md

Shows the hierarchical composition of the add-select web components: cds-add-select wraps cds-add-select-body, which contains cds-add-select-list with cds-add-select-row items. The multi attribute enables multi-select mode, and the open attribute displays the dialog.

```html
<cds-add-select
  open
  title="Add items"
  description="Select items to add"
  multi
  items-label="Available items"
  global-search-label="Search items">
  <cds-add-select-body>
    <cds-add-select-list multi>
      <cds-add-select-row
        item-id="item-1"
        title="Item 1"
        subtitle="Description for item 1"
        value="item-1"></cds-add-select-row>
      <cds-add-select-row
        item-id="item-2"
        title="Item 2"
        subtitle="Description for item 2"
        value="item-2"></cds-add-select-row>
    </cds-add-select-list>
  </cds-add-select-body>
</cds-add-select>
```

--------------------------------

### Before: TooltipIcon usage in v10

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v10 TooltipIcon component before migration. This component was problematic because it added a tooltip to a non-interactive element. Use IconButton as a replacement in v11.

```jsx
import { TooltipIcon } from 'carbon-components-react';

function ExampleComponent() {
  return (
    <TooltipIcon
      tooltipText="Example tooltip"
      onClick={() => {
        // ...
      }}
      renderIcon={Filter}
    />
  );
}
```

--------------------------------

### Template for @ibm/plex font file paths

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

General template for constructing paths to font files in the `@ibm/plex` package. Placeholders represent font family, output type, format, weight, style, and split.

```text
@ibm/plex/<font-family-name>/fonts/<output>/<format>/<font-family-name>-<font-weight>-<?font-style>-<?font-split>.<format>
```

--------------------------------

### DataTable render function with prop getters

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DataTable/DataTable.mdx

Render function example for the DataTable component. The children prop receives prop getters and state, and must be applied to the corresponding components to enable built-in functionality like sorting, selection, and expansion.

```jsx
<DataTable headers={headers} isSortable rows={rows}>
  {({
    getCellProps,
    getHeaderProps,
    getRowProps,
    getSelectionProps,
    getTableProps,
    headers,
    rows,
  }) => (
    <Table {...getTableProps()}>
      <TableHead>
        <TableRow>
          <TableSelectAll {...getSelectionProps()} />
          {headers.map((header) => (
            <TableHeader {...getHeaderProps({ header })}>
              {header.header}
            </TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow {...getRowProps({ row })}>
            <TableSelectRow {...getSelectionProps({ row })} />
            {row.cells.map((cell) => (
              <TableCell {...getCellProps({ cell })}>{cell.value}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )}
</DataTable>
```

--------------------------------

### Use React.forwardRef for icon refs

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Update code to use React.forwardRef when the codemod cannot infer the correct transform for icons with refs. Two alternatives are shown.

```jsx
<MyComponent
  renderIcon={React.forwardRef((props, ref) => (
    <Search ref={ref} size={16} {...props} />
  ))}
/>;

// Or, alternatively:
const Search16 = React.forwardRef((props, ref) => {
  return <Search ref={ref} size={16} {...props} />;
});

<MyComponent renderIcon={Search16} />;
```

--------------------------------

### Import Carbon colors and use $blue-50

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Replaces the v10 @import of 'carbon-components/scss/globals/scss/colors'. The entry point now lives at scss/_colors.scss in @carbon/styles. Use the $colors map to access color tokens like $blue-50.

```scss
@use '@carbon/styles/scss/colors';

.example {
  color: colors.$blue-50;
}
```

--------------------------------

### Sass @use with @carbon/themes causing double initialization

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/docs/sass.md

This example shows the Sass code that triggers the error when using @carbon/themes with a custom theme. It demonstrates why themes cannot be re-exported from the main entrypoint, as the module would be initialized twice, violating the Sass Module system.

```scss
@use '@carbon/themes/scss/modules/themes';
@use '@carbon/themes' with (
  $theme: themes.$g100
);
```

--------------------------------

### PropTypes.func prop type changed to have different arguments (major)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/versioning.md

When a PropTypes.func prop's arguments change types or are removed, it is a major semver bump. The example shows an onChange handler that destructures a and b from a single argument object.

```diff
import { SomeComponent } from 'carbon-components-react';

function ExampleComponent() {
  function onChange(arg) {
    // If a or b change types (from number to string) or if they are removed
    // (a or b no longer exists)
    const { a, b } = arg;
  }

  return <SomeComponent onChange={onChange} />;
}
```

--------------------------------

### Avoid nesting selectors: .component:focus example

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows a nested selector pattern that makes it hard to locate the generated .component:focus selector. Avoid nesting to reduce CSS bundle bloat and improve maintainability.

```scss
// Early on in the file
.component {
  // ...
}

// ...

// Later on in the file
.component {
  &:focus {
    // ...
  }
}
```

--------------------------------

### Checkout release tag

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Checkout the release tag locally to run Release workflow commands.

```bash
git checkout vX.Y.X
```

--------------------------------

### Importing accordion in v11 (styles)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, component files live at 'scss/components/<component>/_index.scss' and can be shortened to 'scss/components/<component>' since Dart Sass resolves '_index.scss' automatically.

```scss
// For styles
@use '@carbon/styles/scss/components/accordion';
```

--------------------------------

### AccordionSkeleton className prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

The className prop passed into AccordionSkeleton is forwarded to the underlying skeleton container. Useful for specifying a custom class name for layout.

```jsx
<AccordionSkeleton className="custom-class" open count={3} />
```

--------------------------------

### Enable FlexGrid styles with flexgrid module

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

Option 2: Use the flexgrid module to emit FlexGrid styles.

```scss
/* Option 2: Use the flexgrid module */

@use '@carbon/react/scss/grid/flexbox';
```

--------------------------------

### Accordion className prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

The className prop passed into Accordion is forwarded to the underlying accordion container, useful for specifying a custom class name for layout.

```jsx
<Accordion className="custom-class">
  <AccordionItem title="Panel A">Panel A</AccordionItem>
  <AccordionItem title="Panel B">Panel B</AccordionItem>
  <AccordionItem title="Panel C">Panel C</AccordionItem>
</Accordion>
```

--------------------------------

### DatePicker dateFormat prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/__stories__/DatePickerV2.mdx

Use the dateFormat prop to change how the selected date is displayed. The default format is m/d/Y (MM/DD/YYYY). Supported tokens: m (month 1-12), d (day 1-31), Y (year 4 digits).

```tsx
<DatePicker dateFormat="Y-m-d">
  <DatePickerInput
    id="date-picker-format"
    placeholder="yyyy-mm-dd"
    labelText="ISO format"
  />
</DatePicker>
```

--------------------------------

### HTML: Layout constraints for child component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Use constraint classes to limit a child component's size range and default within a layout context. The example constrains a button to min 'sm', max 'lg', and default 'md'.

```html
<div class="my-component">
  ...
  <div
    class="cds--layout-constraint--size__default-md cds--layout-constraint--size__min-sm cds--layout-constraint--size__max-lg">
    <!-- The button component will now be constrained to the minimum size of 'sm', the maximum of 'lg' and default to 'md' -->
    <div class="button">...</div>
  </div>
</div>
```

--------------------------------

### Import MultiSelect

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MultiSelect/README.md

Import the MultiSelect component from the library.

```js
import { MultiSelect } from 'carbon-components-react';
```

--------------------------------

### Compose stepping experience with StepProvider and StepGroup

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities-react/src/StepFlow/README.md

Wrap your stepped component in the StepProvider from the utility. Use <StepGroup> and step components with your new step enabled tearsheet component. Any content outside of the <StepGroup> will render on every step.

```tsx
const Example = () => {
  return (
    <StepProvider>
      <Tearsheet>
        <StepGroup>
          <Step1 />
          <Step2 />
          {someCondition && <ConditionalStep />}
        </StepGroup>
      </Tearsheet>
    </StepProvider>
  );
};
```

--------------------------------

### Offset Column with Span and Offset

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/Grid.mdx

Use the object form for breakpoint props to specify both span and offset. This example sets the column to span 2 columns at small breakpoint and 4 columns at medium breakpoint with an offset of 2 columns.

```jsx
<Column sm={2} md={{ span: 4, offset: 2 }} />
```

--------------------------------

### Sass: Set global theme variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Set the global theme variable to use a different theme (e.g., $g100) during import.

```scss
@use '@carbon/themes/scss/themes' as *;
@use '@carbon/themes' with (
  $theme: $g100
);
```

--------------------------------

### Override button-primary token per theme

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Provide theme-specific values for the $button-primary token using the fallback and values structure. Each theme (white, g10, g90, g100) gets its own value, and the reset and button component styles are imported directly.

```scss
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/components/button/tokens' with (
  $button-primary: (
    fallback: #3f51b5,
    values: (
      (theme: themes.$white, value: #3f51b5),
      (theme: themes.$g10, value: #d55bff),
      (theme: themes.$g90, value: #d0b2ff),
      (theme: themes.$g100, value: #cfd2ff),
    ),
  )
);

@use '@carbon/react/scss/reset';
@use '@carbon/react/scss/components/button';
```

--------------------------------

### Run tests with yarn run test

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/examples/vue-cli/README.md

Runs the project's tests.

```bash
yarn run test
```

--------------------------------

### Persistent Search with ContainedList

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ContainedList/ContainedList.mdx

Use this example to render a persistent Search bar below the ContainedList title. The Search component is passed as a child and remains visible on scroll. It filters a hardcoded list of items based on the search term.

```jsx
export const WithPersistentSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const listItems = [
      'List item 1',
      'List item 2',
      'List item 3',
      'List item 4',
    ];

    const results = listItems.filter((listItem) =>
      listItem.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(results);
  }, [searchTerm]);

  return (
    <ContainedList label="List title" kind="on-page" action={''}>
      <Search
        placeholder="Filterable search"
        value={searchTerm}
        onChange={handleChange}
        closeButtonLabelText="Clear search input"
        size="lg"
      />
      {searchResults.map((listItem, key) => (
        <ContainedListItem key={key}>{listItem}</ContainedListItem>
      ))}
    </ContainedList>
  );
};
```

--------------------------------

### Rewrite imports from carbon-components-react to @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Run this codemod to update import paths from the deprecated carbon-components-react package to @carbon/react. This is part of the v11 migration and is covered by the @carbon/upgrade tool.

```bash
npx @carbon/upgrade migrate update-carbon-components-react-import-to-scoped --write
```

--------------------------------

### ContainedList with ExpandableSearch

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ContainedList/ContainedList.mdx

Use this example to add an expandable search bar to a ContainedList via the action prop. The ExpandableSearch filters the list items based on the search term. Note that passing an ExpandableSearch in the title action prop overrides any Search component passed as a child.

```js
export const WithExpandableSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const listItems = [
      'List item 1',
      'List item 2',
      'List item 3',
      'List item 4',
    ];

    const results = listItems.filter((listItem) =>
      listItem.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(results);
  }, [searchTerm]);

  return (
    <ContainedList
      label="List title"
      kind="on-page"
      action={
        <ExpandableSearch
          placeholder="Filterable search"
          value={searchTerm}
          onChange={handleChange}
          closeButtonLabelText="Clear search input"
          size="lg"
        />
      }>
      {searchResults.map((listItem, key) => (
        <ContainedListItem key={key}>{listItem}</ContainedListItem>
      ))}
    </ContainedList>
  );
};
```

--------------------------------

### Updated preview__PageHeader implementation

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

The new preview__PageHeader structure using a composition-based approach with sub-components like Root, BreadcrumbBar, Content, and TabBar.

```tsx
import { preview__PageHeader as PageHeader } from '@carbon/ibm-products';
import {
  Breadcrumb,
  BreadcrumbItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  OperationalTag,
} from '@carbon/react';

<Tabs>
  <PageHeader.Root>
    <PageHeader.BreadcrumbBar
      renderIcon={MyIcon}
      pageActions={
        <PageHeader.BreadcrumbPageActions
          actions={[
            {
              id: 'a1',
              renderIcon: Activity,
              label: 'Refresh',
              onClick: handleRefresh,
            },
          ]}
          overflowMenuLabel="More actions"
        />
      }>
      <Breadcrumb>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/section">Section</BreadcrumbItem>
        <PageHeader.TitleBreadcrumb>My Page</PageHeader.TitleBreadcrumb>
      </Breadcrumb>
    </PageHeader.BreadcrumbBar>

    <PageHeader.Content
      title="My Page"
      renderIcon={MyIcon}
      pageActions={
        <PageHeader.ContentPageActions
          menuButtonLabel="Page actions"
          actions={[
            {
              id: 'pa1',
              onClick: handleCreate,
              body: <Button kind="primary">Create</Button>,
              menuItem: { label: 'Create' },
            },
          ]}
        />
      }>
      <PageHeader.ContentText subtitle="A short description" />
    </PageHeader.Content>

    <PageHeader.TabBar
      tags={
        <PageHeader.TagOverflow>
          <Tag type="blue">Tag 1</Tag>
        </PageHeader.TagOverflow>
      }
      scroller={
        <PageHeader.ScrollButton
          collapseText="Collapse header"
          expandText="Expand header"
        />
      }>
      <TabList>
        <Tab>Overview</Tab>
        <Tab>Settings</Tab>
      </TabList>
    </PageHeader.TabBar>
  </PageHeader.Root>
  <TabPanels>
    <TabPanel>Overview content</TabPanel>
    <TabPanel>Settings content</TabPanel>
  </TabPanels>
</Tabs>;
```

--------------------------------

### Checkout v10 and pull latest

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

After the release PR is merged, checkout the v10 branch and pull the latest changes from upstream.

```bash
git checkout v10
```

```bash
git pull upstream v10
```

--------------------------------

### Button tooltipAlignment prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Button/Button.mdx

The `tooltipAlignment` prop changes where the tooltip text and caret are rendered in relation to the Button. Accepted options are `start`, `center`, and `end`, with a default of `center`.

```APIDOC
## Button `tooltipAlignment` prop

### Description
The `tooltipAlignment` prop is used to change where the tooltip text and caret is rendered in relation to the `Button`. Accepted options are `start`, `center`, and `end`. The default alignment is `center`.

### Parameters
#### Prop
- **tooltipAlignment** (string) - Optional - Accepted values: `start`, `center`, `end`. Default: `center`.

### Example
```jsx
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" tooltipAlignment="start" />
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" />
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" tooltipAlignment="end"/>
```
```

--------------------------------

### Stacking Tearsheets with cds-tearsheet-stack

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

Wrap multiple tearsheets in a <cds-tearsheet-stack> component to enable stacking. The stack-step-size attribute controls the visual offset between stacked tearsheets and accepts 'sm', 'md', or 'lg'. This opt-in approach improves performance and gives explicit control over which tearsheets participate in stacking.

```html
<cds-tearsheet-stack stack-step-size="lg">
  <!-- First tearsheet -->
  <cds-tearsheet id="tearsheet-1" open>
    <cds-tearsheet-header slot="header">
      <cds-button slot="header-actions"> Open details </cds-button>
    </cds-tearsheet-header>
    <!-- ... -->
  </cds-tearsheet>

  <!-- Second tearsheet - will stack on top -->
  <cds-tearsheet id="tearsheet-2" open>
    <!-- ... -->
  </cds-tearsheet>
</cds-tearsheet-stack>
```

--------------------------------

### Import v10 themes from @carbon/themes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Use this import to access the v10 theme objects (white, g10, g90, g100) when migrating from v10 to v11. The v10 export is available from '@carbon/themes'.

```javascript
import { v10 } from '@carbon/themes';

const { white, g10, g90, g100 } = v10;
```

--------------------------------

### Web components package structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0009-ibm-products-to-core-migration.md

Directory layout for a migrated web component in the Carbon monorepo, including LitElement class, stories, registration, and shared constants.

```text
packages/web-components/src/components/<component-name>/
├── <component-name>.ts        ← LitElement class (@customElement decorator)
├── <component-name>.stories.ts
├── index.ts                   ← registers custom element
└── defs.ts                    ← enums / constants shared with stories
```

--------------------------------

### Set inline theme with Theme component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Theme/Theme.mdx

Use Theme to apply a theme to a portion of the UI. Children of Theme use the design token values from that theme. Note the example has a typo: the closing tag is <GlobalTheme> instead of </GlobalTheme>.

```jsx
import { Theme } from '@carbon/react';

function ExamplePage() {
  return (
    <GlobalTheme theme="white">
      <h1>Page title</h1>
      <p>Display in the white theme</p>
      <Theme theme="g100">
        <p>Display in the g100 theme</p>
      </Theme>
    <GlobalTheme>
  );
}
```

--------------------------------

### Commit and push release changes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Stage all changes, commit with a release message, and push the branch to origin.

```bash
git add -A
```

```bash
git commit -m 'chore(release): vX.Y.Z'
```

```bash
git push --set-upstream origin release/vX.Y.Z
```

--------------------------------

### Translate based on state with specific message IDs

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Use this pattern when a translation depends on state, such as sort direction. Create specific message IDs for each state value and choose which one to use based on the current state. This example toggles between ascending and descending sort messages.

```tsx
const MyComponent = ({
  translateWithId: t = defaultTranslateWithId,
}: MyComponentProps) => {
  const [sortDirection, setSortDirection] = useState('ASC');

  function onClick() {
    if (sortDirection === 'ASC') {
      setSortDirection('DESC');
    } else {
      setSortDirection('ASC');
    }
  }

  return (
    <>
      <span>
        {sortDirection === 'ASC'
          ? t('carbon.component-name.sort.ascending')
          : t('carbon.component-name.sort.descending')}
      </span>
      <button onClick={onClick}>
        {t('carbon.component-name.toggle-sort')}
      </button>
    </>
  );
};
```

--------------------------------

### Date picker date-format attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Use the date-format attribute to change how the selected date is displayed in the input. The default format is m/d/Y (MM/DD/YYYY). Supported tokens are m (Month 1-12), d (Day 1-31), and Y (Year 4 digits).

```html
<cds-preview-date-picker date-format="Y-m-d">
  <cds-preview-date-picker-input
    kind="single"
    placeholder="yyyy/mm/dd"></cds-preview-date-picker-input>
</cds-preview-date-picker>
```

--------------------------------

### Before: Importing size-specific icons from @carbon/icons-react

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Shows the v10 pattern of importing separate icon components for each size (Add32, Add24, Add20, Add16). This approach is replaced in v11 by a single Add component with a size prop.

```jsx
import { Add32, Add24, Add20, Add16 } from '@carbon/icons-react';

function MyComponent() {
  return (
    <>
      <Add32 />
      <Add24 />
      <Add20 />
      <Add16 />
    </>
  );
}
```

--------------------------------

### Tag the release commit

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Create an annotated tag for the release commit.

```bash
git tag -a v11.2.0-rc.0 -m 'v11.2.0-rc.0'
```

--------------------------------

### Use CDN artifacts for dropdown (v1.16.0+)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/README.md

Add the CDN script and style to your page to use the dropdown component without a build step. The style hides the custom elements until they are defined. Available starting at version v1.16.0.

```html
<!doctype html>
<html>
  <head>
    <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/version/v2.65.0/dropdown.min.js"></script>
    <style type="text/css">
      <!-- hide custom element until it has been defined //-->
      cds-dropdown:not(:defined),
      cds-dropdown-item:not(:defined) {
        visibility: hidden;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <cds-dropdown trigger-content="Select an item">
        <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
        <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
        <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
        <cds-dropdown-item value="dea">Option 4</cds-dropdown-item>
        <cds-dropdown-item value="router">Option 5</cds-dropdown-item>
      </cds-dropdown>
    </div>
  </body>
</html>
```

--------------------------------

### AccordionItem title prop example with function

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

The title prop can accept a string or a node. A custom title prop that renders an interactive element is considered an accessibility violation.

```jsx
<Accordion align="start">
  <AccordionItem title={() => <span>Panel A</span>}>Panel A</AccordionItem>
  <AccordionItem title="Panel B">Panel B</AccordionItem>
  <AccordionItem title="Panel C">Panel C</AccordionItem>
</Accordion>
```

--------------------------------

### layout.use generated CSS with min

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows the local CSS custom property emitted when a minimum size is provided.

```scss
.my-component {
  @include layout.use('size', $default: 'md', $min: 'sm');
}
```

```scss
.my-component {
  --cds-layout-size-height-local: clamp(
    max(var(--cds-layout-size-height-min), var(--cds-layout-size-height-sm)),
    var(--cds-layout-size-height, var(--cds-layout-size-height-md)),
    var(--cds-layout-size-height-max)
  );
}
```

--------------------------------

### Icon Button tooltipAlignment prop usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Button/Button.mdx

Shows how to set the tooltip alignment for icon-only buttons using the `tooltipAlignment` prop. Accepted options are `start`, `center`, and `end`; the default is `center`.

```jsx
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" tooltipAlignment="start" />
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" />
<Button hasIconOnly renderIcon={Add} iconDescription="Add to selection" tooltipAlignment="end"/>
```

--------------------------------

### Use icon with size prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-react/README.md

Shows how to use the size prop to render an icon at 32px. The default size is 16px, and 16px, 20px, 24px, and 32px are supported.

```jsx
import { Add } from '@carbon/icons-react';

function ExampleComponent() {
  return <Add size={32} />;
}
```

--------------------------------

### Set compatibility theme with $fallback in SCSS

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

Use this SCSS snippet to configure a Carbon v11 theme with a v10 compatibility fallback. It sets the current theme to `$g100` and includes the compatibility theme for `$g100` as the `$fallback`, enabling incremental migration between v10 and v11 tokens. Requires importing the compat themes, themes, and theme modules as shown.

```scss
@use '@carbon/react/scss/compat/themes' as compat;
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/theme' with (
  $fallback: compat.$g100,
  $theme: themes.$g100
);
@use '@carbon/react';

:root {
  @include theme.theme();
}
```

--------------------------------

### cds-layout size attribute example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/layout/layout.mdx

Shows how cds-layout sets a size context for child components. Children with an explicit size attribute (e.g., size="lg") are unaffected, while others inherit the layout's size (e.g., sm) or fall back to their default (md) when no size is set.

```html
<div>
  <!-- This text input is always lg -->
  <cds-text-input size="lg" label="Text input"></cds-text-input>

  <!-- This text input will render with its default size (md) -->
  <cds-text-input label="Text input"></cds-text-input>

  <cds-layout size="sm">
    <!-- This text input will still be lg -->
    <cds-text-input size="lg" label="Text input"></cds-text-input>

    <!-- This text input will be sm -->
    <cds-text-input label="Text input"></cds-text-input>
  </cds-layout>
</div>
```

--------------------------------

### Date picker with max-date attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/date-picker.mdx

Use the `max-date` attribute on `cds-date-picker` to limit date selection to any date before the specified date. The example sets `max-date="09/15/2020"`.

```html
<cds-date-picker max-date="09/15/2020">
  <cds-date-picker-input
    kind="single"
    placeholder="mm/dd/yyyy"></cds-date-picker-input>
</cds-date-picker>
```

--------------------------------

### Use theme design token as CSS variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Imports the theme entrypoint and uses the $background token as a CSS custom property.

```scss
@use '@carbon/styles/scss/theme';

body {
  background: theme.$background;
}
```

--------------------------------

### Auto-saving HTML markup with cds-textarea and status message

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/saving/saving.mdx

Provides the HTML structure for the auto-saving example. The status message div is rendered only after the user edits the field, and the error icon appears only when the save fails.

```html
<cds-textarea
  id="save-auto-textarea"
  label="Enter in the thing you wanted saved"></cds-textarea>
<div class="saving__message">
  <!-- Rendered only after the user edits the field -->
  <div class="saving__error-icon">
    <!-- Rendered only when the save fails -->
  </div>
  <p class="saving__text">Saving...</p>
</div>
```

--------------------------------

### Import GuideBanner component (JavaScript)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/guide-banner/guide-banner.mdx

Import the GuideBanner web component module to use it in your application. This is the JavaScript import statement for the component.

```javascript
import '@carbon/web-components/es/components/guide-banner/index.js';
```

--------------------------------

### Custom function definitions for PageHeader actions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Defines arrays of action items and breadcrumb page actions used in the PageHeader example. The first array includes multiple action objects with props for both collapsed and non-collapsed states. The second defines a set of icon-only buttons for the breadcrumb bar.

```javascript
const BreadcrumbBeeIcon = () => <Bee size={16} />;
```

```javascript
const pageActionButtonItems = [
  {
    // props used for both collapse menu item and non-collapsed action form
    id: 'action1',
    onClick: () => console.log('Action 1'),
    // component to render when non-collapsed
    body: (
      <Button
        renderIcon={AiGenerate}
        iconDescription="Icon Description 1"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    ),
    // props to pass to the corresponding collapsed menu item
    menuItem: {
      label: 'action 1',
    },
  },
  {
    id: 'action2',
    onClick: () => console.log('Action 2'),
    body: (
      <Button
        renderIcon={Activity}
        iconDescription="Icon Description 2"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    ),
    menuItem: {
      label: 'action 2',
    },
  },
  {
    id: 'action3',
    onClick: () => console.log('Action 3'),
    body: (
      <Button
        renderIcon={Activity}
        iconDescription="Icon Description 3"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    ),
    menuItem: {
      label: 'action 3',
    },
  },
  {
    id: 'action4',
    onClick: () => console.log('Action 4'),
    body: (
      <Button
        renderIcon={Activity}
        iconDescription="Icon Description 4"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    ),
    menuItem: {
      label: 'action 4',
    },
  },
  {
    id: 'primary-action',
    onClick: () => console.log('Primary action'),
    body: (
      <Button kind="primary" renderIcon={Add} size="md">
        Primary action
      </Button>
    ),
    menuItem: {
      label: 'Primary action',
    },
  },
];
```

```javascript
const breadcrumbPageActions = (
    <>
      <Button
        renderIcon={Activity}
        iconDescription="Icon Description 1"
        hasIconOnly
        size="md"
        kind="ghost"
      />
      <Button
        renderIcon={AiGenerate}
        iconDescription="Icon Description 2"
        hasIconOnly
        size="md"
        kind="ghost"
      />
      <Button
        renderIcon={CloudFoundry_1}
        iconDescription="Icon Description 3"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    </>
  );
```

--------------------------------

### BreadcrumbItem is-currentpage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/breadcrumb/breadcrumb.mdx

Use the is-currentpage attribute on a breadcrumb-link to indicate the current page. The example shows a breadcrumb with two breadcrumb-item elements and a cds-breadcrumb-item containing a cds-breadcrumb-link with the is-currentpage attribute.

```html
<breadcrumb>
  <breadcrumb-item href="#">Breadcrumb 1</breadcrumb-item>
  <breadcrumb-item href="#">Breadcrumb 2</breadcrumb-item>
  <cds-breadcrumb-item>
    <cds-breadcrumb-link is-currentpage>Breadcrumb 3</cds-breadcrumb-link>
  </cds-breadcrumb-item>
</breadcrumb>
```

--------------------------------

### Breadcrumb no-trailing-slash

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/breadcrumb/breadcrumb.mdx

Use the noTrailingSlash attribute on the breadcrumb element to omit the trailing slash from the current page. The example shows a breadcrumb with three breadcrumb-item elements, each with an href attribute.

```html
<breadcrumb no-trailing-slash="">
  <breadcrumb-item href="#">Breadcrumb 1</breadcrumb-item>
  <breadcrumb-item href="#">Breadcrumb 2</breadcrumb-item>
  <breadcrumb-item href="#">Breadcrumb 3</breadcrumb-item>
</breadcrumb>
```

--------------------------------

### Include all Carbon styles

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Use this Sass import to include all Carbon styles.

```scss
@use '@carbon/react';
```

--------------------------------

### Basic resizer grid HTML structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Minimal HTML structure using cds-resizer-grid, cds-resizer-panel, and cds-resizer-handle to create a resizable two-panel layout.

```html
<cds-resizer-grid>
  <cds-resizer-panel>
    <div>Panel 1 content</div>
  </cds-resizer-panel>
  <cds-resizer-handle></cds-resizer-handle>
  <cds-resizer-panel>
    <div>Panel 2 content</div>
  </cds-resizer-panel>
</cds-resizer-grid>
```

--------------------------------

### DatePicker maxDate with US and European formats

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Limits date selection to before the specified date. The string format depends on the locale; the first example uses the default US format (September 1st), the second uses the 'no' locale with 'd/m/Y' format (January 9th).

```jsx
<DatePicker maxDate="09/01/2020">
  <DatePickerInput placeholder="mm/dd/yyyy" />
</DatePicker>

<DatePicker
  maxDate="09/01/2020"
  datePickerType="single"
  locale="no"
  dateFormat="d/m/Y">
  <DatePickerInput placeholder="mm/dd/yyyy" />
</DatePicker>;
```

--------------------------------

### cds-page-sizes-select minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-pagination.md

Rendered output of cds-page-sizes-select with minimum attributes. Includes a label with slot name="label-text" defaulting to 'Items per page:', a select with options 10, 20, 30, and a hidden slot.

```html
<label
  class="cds--pagination__text"
  for="select"
>
  <slot name="label-text">
    Items per page:
  </slot>
</label>
<div class="cds--select__item-count">
  <select
    class="cds--select-input"
    id="select"
  >
    <option value="10">
      10
    </option>
    <option value="20">
      20
    </option>
    <option value="30">
      30
    </option>
  </select>
</div>
<div hidden="">
  <slot>
  </slot>
</div>
```

--------------------------------

### Import specific Sass modules

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Optimize build size by importing only the required module path instead of the entire Carbon styles package.

```scss
@use '@carbon/styles/scss/<path-to-file>';
```

--------------------------------

### Run a Carbon codemod with @carbon/upgrade

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/feature-flags.md

Use this command to run a codemod for migrating to new Carbon components and APIs. Replace <codemod-name> with the specific codemod name. The --write flag applies changes to your files.

```bash
npx @carbon/upgrade migrate <codemod-name> --write
```

--------------------------------

### Generate changelog with Carbon CLI

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Run the Carbon CLI changelog command from the /carbon directory to generate release notes for the version range.

```bash
./packages/cli/bin/carbon-cli.js changelog v11.5.0..v11.6.0
```

--------------------------------

### Run PageHeader migration codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Execute this command at the root of your project to automatically migrate from the deprecated PageHeader to the new composable preview__PageHeader.

```sh
npx @carbon/upgrade migrate ibm-products-update-page-header-composable
```

--------------------------------

### Item sizing formula

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/overflowHandler/README.md

Shows the formula used to compute each item's effective size. The gap and any CSS padding or margin on the item are already factored in; re-initialize the handler if these values change dynamically.

```text
effectiveSize = boundingClientRect[dimension]
              + margin (inline-start + inline-end)   ← width
              + margin (block-start + block-end)     ← height
              + gap
```

--------------------------------

### Import and use cds-icon-button with icon and tooltip

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon-button/icon-button.mdx

Import the icon-button component and an icon, then render a cds-icon-button with an icon slot and a tooltip-content slot. The button is labeled for accessibility.

```javascript
import '@carbon/web-components/es/components/icon-button/index.js';
import Edit16 from '@carbon/icons/es/edit/16.js';

function App() {
  return html`<cds-icon-button>
    ${iconLoader(Edit16, { slot: 'icon' })}
    <span slot="tooltip-content">label</span>
  </cds-icon-button>`;
}
```

--------------------------------

### Month Navigation with Temporal.PlainDate

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Shows how to navigate to the next or previous month by sending NEXT_MONTH or PREV_MONTH events. The context's currentMonth is updated to a Temporal.PlainDate.

```typescript
// Navigate to next month
machine.send(DatePickerEvent.NEXT_MONTH);
// Context updated: { currentMonth: Temporal.PlainDate }

// Navigate to previous month
machine.send(DatePickerEvent.PREV_MONTH);
// Context updated: { currentMonth: Temporal.PlainDate }
```

--------------------------------

### Import colors from '@carbon/colors'

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/colors.md

Shows the import block at the top of a theme file, importing color values from '@carbon/colors'. This is where you add new colors you need.

```js
import {
  // Blue
  blue60,
  blue70,
  blue80,

  // ...
} from '@carbon/colors';
```

--------------------------------

### Get current theme with useTheme hook

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Theme/Theme.mdx

useTheme returns the current theme for a component, useful for conditional rendering based on the theme.

```jsx
import { useTheme } from '@carbon/react';

function ExampleComponent() {
  const { theme } = useTheme();

  // Use the current theme in your component
}
```

--------------------------------

### downshiftActions Usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComboBox/ComboBox.mdx

Provides a ref that will be mutated to contain downshift action functions. Use with caution: calling these actions modifies downshift's internal state and may conflict with Combobox's state management. The example shows reopening the menu when the selected item is cleared.

```jsx
const downshiftActions = useRef();

return (
  <ComboBox
    ...
    downshiftActions={downshiftActions}
    downshiftProps={{
      onStateChange: (changes) => {
        if (changes.selectedItem === null) {
          downshiftActions?.current?.openMenu?.();
          return;
        }
      },
    }}
  />
);
```

--------------------------------

### Access design tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Imports the theme entrypoint and uses the Sass variable for the background token in a CSS rule.

```scss
@use '@carbon/styles/scss/theme';

body {
  background: theme.$background;
}
```

--------------------------------

### Test DatePickerStateMachine transitions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Demonstrates how to test state transitions and context updates for the DatePickerStateMachine, including handling focus, calendar interactions, and outside clicks.

```typescript
import {
  DatePickerStateMachine,
  DatePickerState,
  DatePickerEvent,
} from './state-machine';

describe('DatePickerStateMachine', () => {
  it('should transition from IDLE to FOCUSED on INPUT_FOCUS', () => {
    const machine = new DatePickerStateMachine();

    expect(machine.getState()).toBe(DatePickerState.IDLE);

    machine.send(DatePickerEvent.INPUT_FOCUS);

    expect(machine.getState()).toBe(DatePickerState.FOCUSED);
    expect(machine.getContext().isFocused).toBe(true);
  });

  it('should handle calendar opening and date selection', () => {
    const machine = new DatePickerStateMachine({ mode: 'single' });

    machine.send(DatePickerEvent.CALENDAR_OPEN);
    expect(machine.getState()).toBe(DatePickerState.CALENDAR_OPEN);

    machine.send(DatePickerEvent.DATE_SELECT, {
      date: new Date('2024-01-15'),
    });

    expect(machine.getState()).toBe(DatePickerState.DATE_SELECTED);
    expect(machine.getContext().selectedDate).toBeDefined();
  });

  it('should close calendar on outside click', () => {
    const machine = new DatePickerStateMachine({ mode: 'single' });

    machine.send(DatePickerEvent.CALENDAR_OPEN);
    expect(machine.getState()).toBe(DatePickerState.CALENDAR_OPEN);

    machine.send(DatePickerEvent.OUTSIDE_CLICK);
    expect(machine.getState()).toBe(DatePickerState.IDLE);
  });
});
```

--------------------------------

### Single panel programmatic resize with events

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Uses cds-resizer-handle standalone and listens to resize-start and resize-drag events to update panel height. The resize-drag event provides e.detail.delta for movement; height is clamped to a minimum of 48px.

```html
<div class="container">
  <div class="panel" id="myPanel">Panel content</div>
  <cds-resizer-handle></cds-resizer-handle>
</div>

<script>
  const handle = document.querySelector('cds-resizer-handle');
  const panel = document.getElementById('myPanel');
  let initialHeight = 0;

  handle.addEventListener('resize-start', () => {
    initialHeight = panel.offsetHeight;
  });

  handle.addEventListener('resize-drag', (e) => {
    const newHeight = initialHeight + e.detail.delta;
    panel.style.height = `${Math.max(48, newHeight)}px`;
  });
</script>
```

--------------------------------

### Stage and commit release changes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Stage all changes and commit with the release message. The commit message follows the pattern 'chore(release): vX.Y.Z'.

```bash
git add -A
```

```bash
git commit -m 'chore(release): vX.Y.Z'
```

--------------------------------

### Clone Carbon repository

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Clone the Carbon repository.

```bash
git clone https://github.com/carbon-design-system/carbon.git
```

--------------------------------

### Flatten a region with CSS custom properties

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Set --cds-button-radius on an ancestor to affect all descendant buttons. The example shows a toolbar with radius 0 and an icon button with radius 0.25rem.

```css
.my-toolbar {
  --cds-button-radius: 0;
}

.my-icon-button {
  --cds-button-radius: 0.25rem; /* $border-radius-04 */
}
```

--------------------------------

### Preview changes with dry and print options

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/transforms/ARCHITECTURE.md

Use this command to preview changes without applying them. The -d flag enables dry mode and -p prints the output.

```bash
yarn jscodeshift -d -p -t transforms/<name>.js 'path/to/file'
```

--------------------------------

### Custom step layout in CreateTearsheetStep.tsx

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/CreateTearsheet.mdx

Edit CreateTearsheetStep.tsx to change the layout structure by modifying the Grid/Column structure. The example shows a Column with xlg=16, lg=16, md=8, sm=4 for custom layout.

```jsx
// Modify the Grid/Column structure
<Grid>
  <Column xlg={16} lg={16} md={8} sm={4}>
    {/* Your custom layout */}
  </Column>
</Grid>
```

--------------------------------

### Vanilla JS import pattern for an icon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons/README.md

Shows the import pattern for a Carbon icon in Vanilla JavaScript. Replace with the desired icon name, module type (es, lib, umd), path, and size.

```js
import IconName from '@carbon/icons/<module-type>/path-to-icon/size';
```

--------------------------------

### Rebuild and Update Snapshots for Icons

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run these commands when icons changed to rebuild the relevant packages and update snapshots.

```bash
yarn lerna run build --scope='@carbon/icons-react' --include-dependencies
```

```bash
yarn test:e2e -u
```

--------------------------------

### Debugging steps for implicit return arrow function

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows the four steps required to debug a value in an implicit return function, highlighting the extra work compared to explicit returns.

```js
// Step 1. The code as originally authored
const add = (a, b) => a + b;

// Step 2. Update the code to no longer use the implicit return
const add = (a, b) => {
  return a + b;
};

// Step 3. Add any debugging code or ways to introspect its values
const add = (a, b) => {
  console.log(a);
  return a + b;
};

// Step 4. Undo these changes and bring back to original format
const add = (a, b) => a + b;
```

--------------------------------

### Checkout main branch

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Switch to the main branch before pulling the latest code.

```bash
git checkout main
```

--------------------------------

### Controlled Checkbox Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Checkbox/Checkbox.mdx

Use this controlled checkbox component to manage the checked state via React state. The onChange handler receives the checked boolean and updates the state accordingly.

```jsx
function ExampleComponent() {
  const [isChecked, setIsChecked] = useState(false);
  return (
    <Checkbox
      id="checkbox"
      labelText="checkbox"
      checked={isChecked}
      onChange={(_, { checked }) => setIsChecked(checked)}
    />
  );
}
```

--------------------------------

### usePrefix basic usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/internal/usePrefix.mdx

Basic usage of the usePrefix hook to retrieve the current prefix used in Carbon classes.

```js
import { usePrefix } from '@carbon/react';

function ExampleComponent() {
  const prefix = usePrefix();
}
```

--------------------------------

### Render icons with JavaScript imports

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon/icon.mdx

Imports three icons from the Carbon icons package and renders them using the cds-icon component with the .icon property binding.

```html
<script>
  import Add16 from '@carbon/icons/es/add/16.js';
  import ChevronRight16 from '@carbon/icons/es/chevron--right/16.js';
  import Search16 from '@carbon/icons/es/search/16.js';
</script>

<cds-icon .icon="${Add16}"></cds-icon>
<cds-icon .icon="${ChevronRight16}"></cds-icon>
<cds-icon .icon="${Search16}"></cds-icon>
```

--------------------------------

### Tag and push release commit

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Create an annotated tag for the release and push it to upstream to trigger the release action.

```bash
git tag -a vX.Y.Z -m 'vX.Y.Z'
```

```bash
git push upstream refs/tags/vX.Y.Z
```

--------------------------------

### Manual tab activation with activation="manual"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tabs/Tabs.mdx

Sets the TabList activation prop to "manual" so users activate a tab and display its panel by pressing Space or Enter, instead of automatic activation on focus.

```jsx
<Tabs>
  <TabList aria-label="List of tabs" activation="manual">
    <Tab>Tab Label 1</Tab>
    <Tab>Tab Label 2</Tab>
    <Tab>Tab Label 3</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Tab Panel 1</TabPanel>
    <TabPanel>Tab Panel 2</TabPanel>
    <TabPanel>Tab Panel 3</TabPanel>
  </TabPanels>
</Tabs>
```

--------------------------------

### Render icons with custom classes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon/icon.mdx

Renders icons with custom CSS classes (blue, green, red) to demonstrate styling with custom classes.

```html
<cds-icon .icon="${Add16}" class="blue"></cds-icon>
<cds-icon .icon="${ChevronRight16}" class="green"></cds-icon>
<cds-icon .icon="${Search16}" class="red"></cds-icon>
```

--------------------------------

### getItemDepth: Get depth of an item

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Returns the depth/level of an item in the hierarchy (0 for root level). Returns -1 if item not found. This method is cached for performance.

```typescript
const depth = dataManager.getItemDepth('nested-item');
```

--------------------------------

### Stacking multiple Tearsheets with StackProvider

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tearsheet/Tearsheet.mdx

Wrap multiple Tearsheets in `<StackProvider>` to enable stacked presentation. Optionally specify `stackStepSize`: `sm` (0.5rem), `md` (0.75rem), or `lg` (1rem, default).

```jsx
<StackProvider>
  <Tearsheet>...</Tearsheet>
  <Tearsheet>...</Tearsheet>
  <Tearsheet>...</Tearsheet>
</StackProvider>
```

--------------------------------

### Carbon grid (flex grid) CDN links

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.mdx

Includes Carbon grid using flex grid and all corresponding grid classes. Provides links for a specific version and the NEXT tag.

```html
// SPECIFIC VERSION
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/web-components/version/[v2.x.y]/grid.css" />

// NEXT tag
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/web-components/tag/next/grid.css" />
```

--------------------------------

### React: Use ClassPrefix component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ClassPrefix/ClassPrefix.mdx

Wrap your app with ClassPrefix and set the prefix prop to change the class prefix in React.

```jsx
import { ClassPrefix } from '@carbon/react';

export default function MyApp() {
  return (
    <ClassPrefix prefix="custom">
      <Page />
    </ClassPrefix>
  );
}
```

--------------------------------

### HTML footer with secondary button

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/styling.md

The button inside this footer changes to the `g100` theme because of the CSS custom property override in the preceding example.

```html
<footer>
  <cds-button kind="secondary">Secondary button</cds-button>
</footer>
```

--------------------------------

### Update import to next barrel

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Change the import path from the v2 barrel to the next barrel to register preview components.

```diff
- import '@carbon/web-components/es/components/text-input/index.js';
+ import '@carbon/web-components/es/components/text-input/next/index.js';
```

--------------------------------

### Enable FlexGrid styles with grid module and mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

Option 3: Use the grid module and call the flex-grid mixin to emit FlexGrid styles.

```scss
/* Option 3: Use the grid module and call the flex-grid mixin */

@use '@carbon/react/scss/grid';
@include grid.flex-grid();
```

--------------------------------

### Toggletip

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Toggletip/Toggletip.mdx

Documentation for the Toggletip component, including usage, alignment options, content customization, and actions.

```APIDOC
## Toggletip

### Description
Renders an accessible popover for interactive content. Requires a ToggletipButton trigger and ToggletipContent for the popover content.

### Usage
```jsx
import { Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react';
import { Information } from '@carbon/react/icons';

<Toggletip>
  <ToggletipButton label="Additional information">
    <Information />
  </ToggletipButton>
  <ToggletipContent>
    <p>Custom content here</p>
  </ToggletipContent>
</Toggletip>;
```

### Alignment
- `top` - Popover renders above the ToggletipButton
- `bottom` - Popover renders below the ToggletipButton
- `left` - Popover renders to the left of the ToggletipButton
- `right` - Popover renders to the right of the ToggletipButton

### Customizing Content
Use the ToggletipContent component to render any child element or component as children.

### Actions
Use the ToggletipActions component to render actions underneath the content of ToggletipContent.

```jsx
<Toggletip>
  <ToggletipButton label="Show information">
    <Information />
  </ToggletipButton>
  <ToggletipContent>
    <p>
      Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed do
      eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
    </p>
    <ToggletipActions>
      <Link href="custom-link">Custom link</Link>
      <Button size="sm">Custom action</Button>
    </ToggletipActions>
  </ToggletipContent>
</Toggletip>
```
```

--------------------------------

### Import Carbon React components for CreateModal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateModal/CreateModal.mdx

Import the required Carbon React components to build the CreateModal pattern: Button, Form, FormGroup, Modal, TextInput, TextArea, RadioButton, Dropdown, and Loading.

```jsx
import {
  Button,
  Form,
  FormGroup,
  Modal,
  TextInput,
  TextArea,
  RadioButton,
  Dropdown,
  Loading,
} from '@carbon/react';
```

--------------------------------

### getTopLevelSelectedItems(selectedIds?: Set<string>): AddSelectItem[]

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Returns only top-level selected items (items without selected ancestors). Useful for getting the minimal set of selected items.

```APIDOC
## getTopLevelSelectedItems(selectedIds?: Set<string>): AddSelectItem[]

### Description
Get only top-level selected items (items without selected ancestors). Useful for getting the minimal set of selected items.

### Method
getTopLevelSelectedItems

### Parameters
- **selectedIds** (Set<string>) - Optional - A set of selected IDs to use for the computation.

### Request Example
```typescript
const topLevel = dataManager.getTopLevelSelectedItems();
```

### Response
Returns an array of AddSelectItem objects that are top-level selected items.
```

--------------------------------

### Basic @font-face template for IBM Plex Sans

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Shows the general structure of an @font-face block for IBM Plex, setting the font family and source URL. Replace 'path-to-webfont.woff2' with the actual file path.

```css
@font-face {
  // Set font family as for IBM Plex Sans
  font-family: 'IBM Plex Sans';
  src: url('path-to-webfont.woff2') format('woff2');
}
```

--------------------------------

### Default font path structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Shows the expected font path structure when using the default monolithic configuration. The path includes the family folder and the font file.

```text
<$font-path>/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Bold.woff2
```

--------------------------------

### Sass: Inline theming with mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/README.md

Use the theme mixin to apply different themes to specific CSS classes. The default white theme is used outside these classes.

```scss
@use '@carbon/themes/scss/themes';
@use '@carbon/themes/scss/theme';

// Uses the default white theme here

.my-dark-theme {
  @include theme.theme(themes.$g90);
}

.my-darker-theme {
  @include theme.theme(themes.$g100);
}
```

--------------------------------

### Render cds-table-batch-action with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/data-table.md

Rendered markup for cds-table-batch-action with no items selected, showing the summary text '0 item selected' and a Cancel button.

```html
<div class="cds--batch-summary">
  <p class="cds--batch-summary__para">
    0 item selected
  </p>
</div>
<div class="cds--action-list">
  <slot>
  </slot>
  <button class="cds--batch-summary__cancel cds--btn cds--btn--primary">
    <slot name="cancel-button-content">
      Cancel
    </slot>
  </button>
</div>

```

--------------------------------

### Usage example: cds-add-select-list with cds-add-select-row

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/add-select/KEYBOARD_ACCESSIBILITY.md

The list automatically manages keyboard navigation. Do not add tabindex attributes to individual items; the list component manages this automatically.

```typescript
// The list automatically manages keyboard navigation
<cds-add-select-list ?multi=${false}>
  <cds-add-select-row
    item-id="1"
    title="Item 1"
    value="item-1"
  ></cds-add-select-row>
  <cds-add-select-row
    item-id="2"
    title="Item 2"
    value="item-2"
    ?has-children=${true}
  ></cds-add-select-row>
</cds-add-select-list>
```

--------------------------------

### tasks/build.js script structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/building-an-icon-library.md

Generic structure for the build script that invokes the build command with the project root as cwd. The path to the build command depends on your implementation.

```javascript
'use strict';

const path = require('path');
const build = require('../src/build');

build({ cwd: path.resolve(__dirname, '../') }).catch((error) => {
  console.error(error);
});
```

--------------------------------

### Disable specific fonts with @carbon/styles/scss/fonts

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/fonts/README.md

Configure the fonts entrypoint to disable specific fonts by setting the $fonts map. This example disables IBM Plex Sans.

```scss
@use '@carbon/styles/scss/fonts' with (
  $fonts: (
    IBM-Plex-Sans: false,
  )
);
```

--------------------------------

### Publish specific component directory

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/code-connect/README.md

Publishes Code Connect configurations for a specific component directory, e.g., tabs.

```sh
npx figma connect publish --dir packages/react/code-connect/tabs
```

--------------------------------

### Import flexbox grid directly

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Imports the flexbox grid styles directly from the grid/flexbox subpath.

```scss
@use '@carbon/styles/scss/grid/flexbox';
```

--------------------------------

### Iterate over $colors map with @each

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/colors/docs/sass.md

Shows how to loop through the $colors map to access each swatch and its grades.

```scss
@use '@carbon/colors';

@each $swatch, $grades in colors.$colors {
  @each $grade in $grades {
    //
  }
}
```

--------------------------------

### Manually create component to fix display name

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

To address the missing display name error, manually create the component as a variable or function declaration.

```jsx
const Add32 = (props) => <Add size={32} {...props} />;
const iconTypes = {
  add: Add32,
};
```

--------------------------------

### Enable per-family Plex loading with @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Set the Sass configuration variable `$use-per-family-plex` to `true` to load IBM Plex per-family packages instead of the legacy `@ibm/plex` package. This is required for projects that want to use the newer per-family packages.

```scss
@use '@carbon/react' with (
  $use-per-family-plex: true
);
```

--------------------------------

### Transform input and output for iconTypes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

The codemod transforms icon component references into inline arrow functions, which may trigger the react/display-rule ESLint rule.

```jsx
// Input
const iconTypes = {
  add: Add32,
};

// Output
const iconTypes = {
  add: (props) => <Add size={32} {...props} />,
};
```

--------------------------------

### Creating and pushing a git tag after publishing

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

After publishing an older library version, create a git tag with a message matching the version and push it to the project to track published versions.

```bash
git tag -a vX.Y.Z # The commit message should match vX.Y.Z
```

```bash
git push upstream vX.Y.Z
```

--------------------------------

### Switch index, name, and text in onChange

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ContentSwitcher/ContentSwitcher.mdx

Shows how index, name, and text are returned in the onChange call, using destructuring and an alert to display the values.

```jsx
<ContentSwitcher
  onChange={(obj) => {
    let { index, name, text } = obj;
    alert(`index: ${index} ||  name: ${name} || text: ${text}`);
  }}>
  <Switch name="one" text="First section" />
  <Switch name="two" text="Second section" />
  <Switch name="three" text="Third section" />
</ContentSwitcher>
```

--------------------------------

### breakpoint-up mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Generates a media query from the width of the given breakpoint to infinity.

```APIDOC
## `breakpoint-up` mixin

### Description
Generates a media query from the width of the given breakpoint to infinity.

### Parameters
- `$name` (String) - Required - The name of the breakpoint.

### Usage
```scss
@include breakpoint-up('md') {
  // styles for md and up
}
```
```

--------------------------------

### Server-side rendering test recipe for ComponentName-test.server.js

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Tests that the component can be imported and rendered in a Node/server environment without using document/window. Uses ReactDOMServer.renderToStaticMarkup.

```javascript
/**
 * @jest-environment node
 */
import ReactDOMServer from 'react-dom/server';
import { ComponentName } from '../ComponentName';

describe('ComponentName - SSR', () => {
  it('should import ComponentName in a node/server environment', () => {
    expect(ComponentName).not.toThrow();
  });

  it('should not use document/window/etc', () => {
    expect(ReactDOMServer.renderToStaticMarkup(ComponentName)).not.toThrow();
  });
});
```

--------------------------------

### Multiple @font-face blocks for IBM Plex Sans weights (Light, Regular, Bold)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Provides three separate @font-face blocks to load IBM Plex Sans with light (300), regular (400), and bold (700) weights. Each block references a specific .woff2 file from the @ibm/plex package.

```css
@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 300;
  src: url('<path-to-ibm-plex>/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Light.woff2')
    format('woff2');
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 400;
  src: url('<path-to-ibm-plex>/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2')
    format('woff2');
}

@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 700;
  src: url('<path-to-ibm-plex>/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Bold.woff2')
    format('woff2');
}
```

--------------------------------

### Custom compareItems for reverse alphabetical sorting

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/multi-select/multi-select.mdx

Overrides the compareItems property to sort items in reverse alphabetical order. The function uses localeCompare with numeric option. This example is used when selection-feedback is set to 'top' or 'top-after-reopen'.

```typescript
const reverseCompare = (
  itemA: string,
  itemB: string,
  { locale }: { locale: string }
) => {
  return itemB.localeCompare(itemA, locale, { numeric: true });
};

...

<cds-multi-select .compareItems=${reverseCompare}>
  <!-- items -->
</cds-multi-select>
```

--------------------------------

### cds-progress-step minimum attributes rendered HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-progress-step.md

Rendered output when the cds-progress-step component is used with only the required attributes. The label text slot contains a paragraph with the text 'First step' and the secondary label slot is empty.

```html
<div
  class="cds--progress-step-button"
  tabindex="0"
>
  <slot name="label-text">
    <p
      aria-describedby="label-tooltip"
      class="cds--progress-label"
      role="button"
      title="First step"
    >
      First step
    </p>
  </slot>
  <slot name="secondary-label-text">
  </slot>
  <span class="cds--progress-line">
  </span>
</div>
```

--------------------------------

### Generate changelog with Carbon CLI

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Run from the root of the monorepo to generate changelog output for the release range.

```bash
./packages/cli/bin/carbon-cli.js changelog vA.B.C..vX.Y.Z
```

--------------------------------

### Section as

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Heading/Heading.mdx

Documentation for the `as` prop of the `Section` component, which allows rendering the outermost node with a custom tag or component.

```APIDOC
## Section as

### Description
Use the `as` prop to render the outermost node of the `Section` component with a specific tag or custom component, instead of the default `<section>`.

### Usage
```jsx
<Section as="article">
  <Heading>Delivery milestones</Heading>
</Section>
```

### Parameters
- **as** (string or component) - Optional - The tag name or custom component to render the outermost node as. Defaults to `section`.
```

--------------------------------

### Version packages with lerna

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Run from the v10 release branch to version packages that have changed since the last version. Use --no-push and --no-git-tag-version to avoid pushing or tagging during versioning.

```bash
yarn lerna version patch \
  --no-push \
  --no-git-tag-version
```

--------------------------------

### Import colors from @carbon/colors

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Imports the colors export from the @carbon/colors package.

```javascript
import { colors } from '@carbon/colors';
```

--------------------------------

### cds-file-uploader with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/file-uploader.md

Rendered output for the cds-file-uploader component when various attributes are set. Shows the structure with label, description, drop container, and file container slots.

```html
<p class="cds--file--label">
  <slot name="label-title">
  </slot>
</p>
<p class="cds--label-description">
  <slot name="label-description">
  </slot>
</p>
<slot name="drop-container">
</slot>
<div class="cds--file-container">
  <slot>
  </slot>
</div>
```

--------------------------------

### HTML: Layout context with size modes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Wrap content in a layout container to set the size mode. The inner component with 'cds--layout--size-md' overrides the parent 'lg' context.

```html
<div class="cds--layout--size-lg">
  <!-- This component will participate in the "lg" size mode -->
  <div class="my-component">...</div>

  <!-- This component will always render in "md" size mode, regardless of the parent layout context -->
  <div class="my-component cds--layout--size-md">...</div>
</div>
```

--------------------------------

### Enable feature flags via configuration

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Use the feature-flags module with a configuration map to enable specific features at the root stylesheet level.

```scss
@use '@carbon/styles/scss/feature-flags' with (
  $feature-flags: (
    'enable-preview-tile-contrast': true,
  )
);
@use '@carbon/styles';
```

--------------------------------

### Render cds-table-batch-action with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/data-table.md

Rendered markup for cds-table-batch-action with three items selected, showing plural 'items selected' and a Cancel button.

```html
<div class="cds--batch-summary">
  <p class="cds--batch-summary__para">
    3 items selected
  </p>
</div>
<div class="cds--action-list">
  <slot>
  </slot>
  <button class="cds--batch-summary__cancel cds--btn cds--btn--primary">
    <slot name="cancel-button-content">
      Cancel
    </slot>
  </button>
</div>

```

--------------------------------

### Promote package to latest on npm

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Add a dist-tag to promote a package to latest. Replace carbon-components-react with the actual package name and use the generated version number.

```bash
npm dist-tag add carbon-components-react@vX.Y.Z latest
```

--------------------------------

### Basic MenuButton Usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MenuButton/MenuButton.mdx

Renders a MenuButton with a label 'Actions' containing three MenuItem children. The label is set via the 'label' prop.

```jsx
<MenuButton label="Actions">
  <MenuItem label="First action" />
  <MenuItem label="Second action" />
  <MenuItem label="Third action" />
</MenuButton>
```

--------------------------------

### Enable FlexGrid styles with feature flag

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

Option 1: Turn on the feature flag to emit FlexGrid styles.

```scss
/* Option 1: Turn on the feature flag */

@use '@carbon/react' with (
  $use-flexbox-grid: true
);
```

--------------------------------

### Configure Sass variables with @use

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Use the @use with syntax to override default configuration variables in the Carbon Design System.

```scss
@use '@carbon/styles' with (
  $font-path: '@ibm/plex'
);
```

--------------------------------

### Run build script in every package with lerna

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Use the `yarn <bin>` syntax to access binaries from `$(yarn bin)`. This command passes `run build` to the `lerna` executable.

```bash
# Access $(yarn bin)/lerna and pass `run build` to the executable
yarn lerna run build
```

--------------------------------

### Migrate from unstable_Pagination to stable Pagination

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v12.md

Shows the diff for replacing the removed `unstable_Pagination` and `unstable_PageSelector` with the stable `Pagination` component. The old code used a render prop with `PageSelector`; the new code uses the built-in page-select control. Review imports, child render-prop usage, and selectors targeting `.cds--unstable-pagination`.

```diff
- import {
-   unstable_Pagination as Pagination,
-   unstable_PageSelector as PageSelector,
- } from '@carbon/react';
-
- <Pagination pageSizes={[10, 20, 30]} totalItems={100}>
-   {({ currentPage, onSetPage, totalPages }) => (
-     <PageSelector
-       currentPage={currentPage}
-       onChange={(event) => onSetPage(event.target.value)}
-       totalPages={totalPages}
-     />
-   )}
- </Pagination>
+ import { Pagination } from '@carbon/react';
+
+ <Pagination pageSizes={[10, 20, 30]} totalItems={100} />
```

--------------------------------

### Custom validation logic in handleNextDisabledState

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateTearsheet/CreateTearsheet.mdx

Edit the handleNextDisabledState function in your copied CreateTearsheet.tsx to add custom validation logic. The example checks if the current step is 1 and the requiredField is missing, returning true to disable the next button.

```jsx
const handleNextDisabledState = (formState, currentStep) => {
  // Add your custom validation logic
  if (currentStep === 1 && !formState?.requiredField) {
    return true;
  }
  return false;
};
```

--------------------------------

### Migrate from Akamai CDN to per-family packages

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Step 1 of migration: update Sass configuration to disable Akamai CDN and enable per-family packages.

```scss
@use '@carbon/react' with (
  // Remove or set Akamai CDN to false
  // $use-akamai-cdn: false,
  // Enable per-family packages
  $use-per-family-plex: true
);
```

--------------------------------

### cds-file-uploader-item with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/file-uploader.md

Rendered output for the cds-file-uploader-item component with minimum attributes. Shows a loading indicator with assistive text 'Delete this file' and a hidden form requirement.

```html
<p class="cds--file-filename">
  <slot>
  </slot>
</p>
<span class="cds--file__state-container">
  <cds-loading
    assistive-text="Delete this file"
    type="small"
  >
  </cds-loading>
</span>
<div
  class="cds--form-requirement"
  hidden=""
>
  <div class="cds--form-requirement__title">
  </div>
  <p
    class="cds--form-requirement__supplement"
    hidden=""
  >
  </p>
</div>
```

--------------------------------

### Render various attributes for <a>

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-btn.md

Renders an anchor element with various attributes: secondary and small size classes, and type text/plain.

```html
<a
  class="cds--btn cds--btn--secondary cds--btn--sm"
  href="about:blank"
  id="button"
  part="button"
  role="button"
  type="text/plain"
>
  <slot>
  </slot>
  <slot name="icon">
  </slot>
</a>
```

--------------------------------

### MenuItem with shortcut, disabled, and danger

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Menu/Menu.mdx

Renders a basic menu with three items: one with a shortcut hint, one disabled, and one marked as dangerous. The shortcut hint is only visual and does not register a browser shortcut.

```jsx
<Menu open>
  <MenuItem label="Copy" shortcut="⌘C" />
  <MenuItem label="Paste" shortcut="⌘V" disabled />
  <MenuItem label="Delete" kind="danger" />
</Menu>
```

--------------------------------

### HTML: Import modal with file uploader and URL input

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/import-and-upload/import-and-upload.mdx

Reference implementation for the import and upload pattern using Carbon web components. Includes cds-modal, cds-file-uploader, cds-text-input, and cds-button within an import-modal wrapper. Handles file selection via drag-and-drop and URL input, with dynamic file list rendering.

```html
<cds-modal>
  <cds-modal-header>
    <cds-modal-heading>Import</cds-modal-heading>
  </cds-modal-header>
  <cds-modal-body>
    <cds-modal-body-content description>
      You can specify a file to import by either dragging it into the drag and
      drop area or by specifying a URL. (Maximum file size of 500KB)
    </cds-modal-body-content>
    <cds-file-uploader label-title="Add files using drag and drop">
      <cds-file-uploader-drop-container
        accept="image/png image/jpeg image/gif"
        @cds-file-uploader-drop-container-changed="${onAddFile}"
      >
        Drag and drop files here or click to upload
      </cds-file-uploader-drop-container>
    </cds-file-uploader>
    <p>Add a file by specifying a URL</p>
    <cds-form-item>
      <cds-text-input
        placeholder="URL"
        label=""
        id="test-id"
        .value="${this.importUrl}"
        @input="${inputHandler}"
      ></cds-text-input>
      <cds-button
        .kind="primary"
        size="md"
        .type="Submit"
        @click="${handleImportFile}"
      >
        Add file
      </cds-button>
    </cds-form-item>
    <div>
      ${hasFiles ? html`
      <p>${this.fileStatusString}</p>
      `: null} ${this.files.map( (file) => html`
      <cds-file-uploader-item
        name="${file.name}"
        class="${classname}"
        size="lg"
        state="${file.status}"
        icon-description="${file.iconDescription}"
        ?invalid="${file.invalid}"
        error-subject="${file.errorSubject}"
        error-body="${file.errorBody}"
        uuid="${file.uuid}"
        @cds-file-uploader-item-deleted="${onRemoveFile}"
        >${file.name} </cds-file-uploader-item
      >` )}
    </div>
  </cds-modal-body>
  <cds-modal-footer>
    <cds-modal-footer-button
      kind="secondary"
      data-modal-close
      @click="${onCloseHandler}"
    >
      Cancel
    </cds-modal-footer-button>
    <cds-modal-footer-button @click="${this.submitHandler}">
      Import
    </cds-modal-footer-button>
  </cds-modal-footer>
</cds-modal>
```

--------------------------------

### Component folder structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/AGENTS.md

The standard directory layout for a component within packages/react/src/components/.

```text
ComponentName/
├── index.tsx                  // Re-exports
├── ComponentName.tsx          // Main component
├── ComponentName.stories.js   // Storybook stories
├── component-name-story.scss  // Styling for storybook stories
├── ComponentName.mdx          // Storybook mdx docs
└── __tests__/
│   └── ComponentName-test.js  // Unit tests
└── docs/
    └── overview.mdx           // Demo file consumed by external documentation
```

--------------------------------

### Enable additional fonts with @carbon/styles/scss/fonts

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/fonts/README.md

Configure the fonts entrypoint to include additional IBM Plex fonts by setting the $fonts map. This example enables IBM Plex Sans Arabic.

```scss
@use '@carbon/styles/scss/fonts' with (
  $fonts: (
    IBM-Plex-Sans-Arabic: true,
  )
);
```

--------------------------------

### toString

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Formats the given icon descriptor into a string. Useful for templates.

```APIDOC
## toString

### Description
Formats the given icon descriptor into a string. Useful for templates.

### Method
Function

### Signature
`toString(descriptor: Object) => String`

### Parameters
- **descriptor** (Object) - Required - The icon descriptor object.

### Example
```js
import { IconName } from '@carbon/icons';
import { toString } from '@carbon/icon-helpers';

const iconString = toString(IconName);
```
```

--------------------------------

### Import preview text input component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/form.mdx

Replace the standard text input import with the preview version to enable native form association.

```diff
- import '@carbon/web-components/es/components/text-input/index.js';
+ import '@carbon/web-components/es/components/text-input/next/index.js';
```

--------------------------------

### Import OptionsTile component (JavaScript)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/options-tile/options-tile.mdx

Import the OptionsTile web component module to register it for use in your application.

```javascript
import '@carbon/web-components/es/components/options-tile/index.js';
```

--------------------------------

### Custom filtering with shouldFilterItem

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComboBox/ComboBox.mdx

Pass a custom filtering function to the `shouldFilterItem` prop to hide items that do not match the user's input. By default the Combobox does not filter; this example defines `filterItems` that compares the item and input value case-insensitively.

```jsx
const filterItems = (menu) => {
  return menu?.item?.toLowerCase().includes(menu?.inputValue?.toLowerCase());
};

<Combobox
  titleText="Label"
  helperText="Helper text"
  items={['Apple', 'Orange', 'Banana']}
  shouldFilterItem={filterItems}
  onChange={() => {}}
/>;
```

--------------------------------

### package.json scripts for icon library

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/building-an-icon-library.md

Defines the build and clean scripts for an icon library package. The clean task integrates with the workspace root's yarn clean, and the build task runs before publishing.

```json
{
  "...": "...",
  "scripts": {
    "build": "yarn clean && node tasks/build.js",
    "clean": "rimraf es lib umd"
  }
}
```

--------------------------------

### Render cds-table-toolbar-search with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/data-table.md

Rendered markup for cds-table-toolbar-search with minimum attributes, showing a large search input with placeholder 'Search'.

```html
<div
  class="cds--search cds--search--lg"
  tabindex="0"
>
  <div class="cds--search-magnifier">
    <slot name="icon">
    </slot>
  </div>
  <label
    class="cds--label"
    for="input"
    part="label-text"
  >
    <slot>
    </slot>
  </label>
  <input
    autocomplete="off"
    class="cds--search-input"
    id="input"
    part="input"
    placeholder="Search"
    role="search"
  >
  <button
    aria-label=""
    class="cds--search-close cds--search-close--hidden"
    part="close-button"
    type="button"
  >
  </button>
</div>

```

--------------------------------

### Slack announcement template

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Template for posting the release announcement in Slack channels, including release notes link and update bullets.

```text
:carbon10: :carbon10: :carbon10:

Hi all! :wave: We wanted to share the release notes for [v11.X.Y](https://github.com/carbon-design-system/carbon/releases/tag/v11.X.Y) 🚀

This release includes the following updates that you and your team can use today:

* item
* item
* item
* ... and a number of additional bugs squashed! 🐛

If you want to stay up to date with our release schedule, check out our [Release Radar wiki page](https://github.com/carbon-design-system/carbon/wiki/Release-radar).

If there are any issues that come up while using this release, please reach out on GitHub or Slack to let us know!

Thanks :tada:
— The Carbon team :carbon10:
```

--------------------------------

### Minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-inline-loading.md

Rendered HTML when the component has minimum attributes, showing the loading animation and text slot.

```html
<div class="cds--inline-loading__animation">
  <div class="cds--loading cds--loading--small">
  </div>
</div>
<p class="cds--inline-loading__text">
  <slot>
  </slot>
</p>

```

--------------------------------

### AILabel with AILabelContent and AILabelActions

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/AILabel/AILabelDataTable.mdx

Shows the basic structure of an AILabel with content and an optional action bar. Place desired elements inside AILabelContent and AILabelActions as children of AILabel.

```jsx
<AILabel>
  <AILabelContent>
    {Content Here}
  </AILabelContent>
</AILabel>
```

```jsx
<AILabel>
  <AILabelContent>
    {Content Here}
    {Optional AI label action bar}
    <AILabelActions>
      <IconButton kind="ghost" label="View">
        <View />
      </IconButton>
      <IconButton kind="ghost" label="Open Folder">
        <FolderOpen />
      </IconButton>
      <IconButton kind="ghost" label="Folders">
        <Folders />
      </IconButton>
      <Button>View details</Button>
    </AILabelActions>
  </AILabelContent>
</AILabel>
```

--------------------------------

### Opt Story into g90 Chromatic Coverage

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/testing.md

Opt a Storybook story into g90 Chromatic coverage by importing allModes and adding the g90 mode to the story's chromatic parameters. g90 is excluded by default to reduce snapshot volume.

```js
import { allModes } from '../../.storybook/modes';

export const MyStory = {
  parameters: {
    chromatic: {
      modes: {
        g10: allModes['g10'],
        g90: allModes['g90'], // Opt into g90 coverage
        g100: allModes['g100'],
      },
    },
  },
};
```

--------------------------------

### Update change event listener

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Listen for the new cds-preview-date-picker-changed event and use its detail.

```diff
- el.addEventListener('cds-date-picker-changed', (e) => { /* flatpickr detail */ });
+ el.addEventListener('cds-preview-date-picker-changed', (e) => {
+   const { selectedDates, value } = e.detail;
+ });
```

--------------------------------

### Self-host IBM Plex Sans with webpack @font-face

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Use this CSS in a webpack-based project to self-host IBM Plex Sans. The `~` prefix tells webpack to resolve the path from the `@ibm/plex` dependency, and the woff2 asset is handled by `file-loader` or `url-loader` in your webpack config.

```css
@font-face {
  font-family: 'IBM Plex Sans';
  font-weight: 400;
  src: url(~@ibm/plex/IBM-Plex-Sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2)
    format('woff2');
}
```

--------------------------------

### SCSS: Component with layout size fallback

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Use this SCSS to define a component's default height while participating in layout contexts. The var() fallback uses the 'md' step token when no context is set.

```scss
.my-component {
  height: var(
    --#{$prefix}-layout-size-height,
    var(--#{$prefix}-layout-size-height-md)
  );
}
```

--------------------------------

### Import from a specific module

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/README.md

Imports a utility from a top-level module with a src/<name>/index.ts file, which is part of the supported public API.

```js
import { utility } from '@carbon/utilities/utility';
```

--------------------------------

### Pass state argument to translateWithId for dynamic messages

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Use this pattern when a translation message depends on a state value, such as a count. Pass the state as a second argument to `translateWithId` so the translation function can use it. This example displays a count and increments it with a button.

```jsx
const MyComponent = ({
  translateWithId: t = defaultTranslateWithId,
}: MyComponentProps) => {
  const [count, updateCount] = useState(0);
  const translationState = {
    count,
  };

  return (
    <>
      <span>
        The current count is:
        {t('carbon.component-name.display-count', translationState)}
      </span>
      <button onClick={() => updateCount(count + 1)}>
        {t('carbon.component-name.increment-count')}
      </button>
    </>
  );
};
```

--------------------------------

### Sass: Configure prefix with @use '@carbon/react/scss/config'

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ClassPrefix/ClassPrefix.mdx

Alternatively, configure the prefix directly via the scss/config module.

```scss
@use '@carbon/react/scss/config' with (
  $prefix: 'custom'
);
```

--------------------------------

### cds-selectable-tile various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-selectable-tile with various attributes. The input has name and value attributes, and the label has classes 'cds--tile--is-selected' and 'cds--tile--light'.

```html
<input
  class="cds--tile-input"
  id="input"
  name="name-foo"
  tabindex="-1"
  type="checkbox"
  value="value-foo"
>
<label
  class="cds--tile cds--tile--is-selected cds--tile--light cds--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="cds--tile__checkmark cds--tile__checkmark--persistent">
  </div>
  <div class="cds--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### Push the release tag

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Push the tag to the upstream repository to trigger the release workflow.

```bash
git push upstream v11.2.0-rc.0
```

--------------------------------

### React component structure with hooks

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Shows the recommended structure for a React function component, using useState and useEffect hooks, with PropTypes for prop validation. Prefer default argument values over defaultProps.

```jsx
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';

function MyComponent({
  // Prefer default argument values to `defaultProps`
  initialValue = 0,
}) {
  // State-related behavior
  const [state, setState] = useState(initialValue);
  // Constants and other variables
  const value = 1;

  // Handlers
  function onClick() {
    // ...
  }

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Output
  return <button onClick={onClick}>Output</button>;
}

MyComponent.propTypes = {
  /**
   * Description of what this prop is for
   */
  initialValue: PropTypes.number,
};
```

--------------------------------

### Use preview text input tag

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/form.mdx

Replace the standard text input tag with the preview version to enable native form association.

```diff
- <cds-text-input name="email"></cds-text-input>
+ <cds-preview-text-input name="email"></cds-preview-text-input>
```

--------------------------------

### Override button-primary token with central entrypoint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Configure the button tokens module with a custom $button-primary value before importing the central @carbon/react entrypoint. The @use statement with the with clause must come before the main import.

```scss
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/components/button/tokens' with (
  $button-primary: #3f51b5
);

@use '@carbon/react';
```

--------------------------------

### Replace carbon--breakpoint with breakpoint in Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, the `carbon--` prefix is removed from mixins, functions, and variables. Use a find-and-replace to update your Sass code, as shown in this diff.

```diff
- @include carbon--breakpoint(lg) {
+ @include breakpoint(lg) {
      width: 42%;
  }
```

--------------------------------

### $flex-grid-columns variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Specifies the number of columns for the flex grid. Default is `16`.

```APIDOC
## `$flex-grid-columns` variable

### Description
Specifies the number of columns for the flex grid. Default is `16`.

### Type
`Number`

### Default
`16`

### Usage
```scss
@use '@carbon/grid' with ($flex-grid-columns: 12);
```
```

--------------------------------

### Tearsheet.Footer with actions prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tearsheet/Tearsheet.mdx

Recommended approach for rendering footer action buttons. The `actions` prop automatically handles button sizing based on the tearsheet variant and screen size.

```jsx
<Tearsheet.Footer
  actions={[
    { kind: 'ghost', label: 'Cancel', onClick: () => setOpen(false) },
    { kind: 'secondary', label: 'Back' },
    { kind: 'primary', label: 'Submit' },
  ]}
/>
```

--------------------------------

### Timezone option for absolute formatting

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/dateTimeFormat/README.md

Provides the timeZone option to absolute functions to display time in a specific timezone (e.g., UTC) instead of the local timezone. The example shows the same timestamp formatted with and without the UTC timezone.

```TypeScript
import { dateTimeFormat } from '@carbon/utilities';

dateTimeFormat.absolute.format(timestamp);
// Apr 4, 2024 at 3:47 PM

dateTimeFormat.absolute.format(timestamp, { timeZone: 'UTC' });
// Apr 4, 2024 at 10:47 PM
```

--------------------------------

### Disabled Combo Box Example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/combo-box/combo-box.mdx

Shows a disabled combo box with helper text, title, and label. The disabled attribute prevents user interaction; use it only when the context is clear, such as after completing a previous form input.

```html
<cds-combo-box
  helper-text="This is some helper text"
  title-text="Combo box title"
  label="Filter..."
  disabled>
  <cds-combo-box-item value="all">Option 1</cds-combo-box-item>
  <cds-combo-box-item value="cloudFoundry">Option 2</cds-combo-box-item>
  <cds-combo-box-item value="staging">Option 3</cds-combo-box-item>
</cds-combo-box>
```

--------------------------------

### cds-pages-select minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-pagination.md

Rendered output of cds-pages-select with minimum attributes. Includes a visually hidden label, a select with options for pages 1-10 (first option selected), and a text span 'of 10 pages'.

```html
<div class="cds--select__page-number">
  <label
    class="cds--label cds--visually-hidden"
    for="select"
  >
    Page number, of 10 pages
  </label>
  <select class="cds--select-input">
    <option
      selected=""
      value="0"
    >
      1
    </option>
    <option value="1">
      2
    </option>
    <option value="2">
      3
    </option>
    <option value="3">
      4
    </option>
    <option value="4">
      5
    </option>
    <option value="5">
      6
    </option>
    <option value="6">
      7
    </option>
    <option value="7">
      8
    </option>
    <option value="8">
      9
    </option>
    <option value="9">
      10
    </option>
  </select>
</div>
<span class="cds--pagination__text">
  of 10 pages
</span>
```

--------------------------------

### Set source type to 'code' for docs

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0006-storybook-organization.md

Use this parameter to format source code in the docs tab when needed.

```typescript
parameters: {
  docs: {
    source: {
      type: 'code',
    },
  },
},
```

--------------------------------

### Import user-avatar component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/user-avatar/user-avatar.mdx

Import the user-avatar component in a JavaScript project to enable its usage in HTML.

```javascript
import '@carbon/web-components/es/components/user-avatar/index.js';
```

--------------------------------

### Offset Column with span and offset object

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

Use the object form for breakpoint props to set both span and offset. The example sets sm to 2 columns and md to span 4 columns with an offset of 2 columns.

```jsx
<Column sm={2} md={{ span: 4, offset: 2 }} />
```

--------------------------------

### getOptions async option loading

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Use `getOptions` to load options asynchronously when the user opens the value picker for an `option`-type property without static `config.options`. It receives the full root state and the current condition, and must return a promise resolving to an options array in `{ id, label }` format.

```javascript
const getOptions = async (rootState, condition) => {
  switch (condition.property) {
    case 'continent':
      return fetchContinents();
    case 'region':
      // rootState lets you read other conditions to filter the result
      const selectedContinent = rootState.groups?.[0]?.conditions?.find(
        (c) => c.property === 'continent'
      )?.value?.id;
      return fetchRegions(selectedContinent);
    default:
      return [];
  }
};
```

--------------------------------

### Deprecation warning with replacement component or link

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Optional enhancement to the deprecation warning: add a closing sentence specifying a replacement component or share a link for more information. Both examples show how to extend the warning message.

```jsx
warning(
  didWarnAboutDeprecation,
  'The `SomeComponent` component has been deprecated and will be removed ' +
    'in the next major release of `carbon-components-react`. Please use the ' +
    '`SomeOtherComponent` component instead'
);

warning(
  didWarnAboutDeprecation,
  'The `SomeComponent` component has been deprecated and will be removed ' +
    'in the next major release of `carbon-components-react`. Please visit ' +
    'ibm.biz/<some-hash> for more information'
);
```

--------------------------------

### Run codemod to migrate flags prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/FeatureFlags/overview.mdx

Run the provided codemod to automatically migrate from the deprecated `flags` object prop to individual boolean props.

```bash
npx @carbon/upgrade migrate featureflag-deprecate-flags-prop --write
```

--------------------------------

### Version packages with lerna

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Run this command to version packages that have changed since the last version. It uses the patch version and does not tag or push.

```bash
yarn lerna version patch --no-git-tag-version --no-push --yes
```

--------------------------------

### Seed Metadata for Icons or Pictograms

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run inside the package to seed metadata information required for the contribution when CI fails due to missing metadata. Note: the scaffold task only applies to the main metadata file; new icons category information must be added by hand.

```bash
node tasks/scaffold.js
```

--------------------------------

### Set async onAction with loading and navigation abort

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Use an async onAction callback to perform validation or API calls; the footer shows a loading state until the promise resolves, and returning true aborts automatic navigation.

```jsx
<InterstitialScreen.Footer
  onAction={async (actionType:'close' | 'start' | 'skip' | 'back' | 'next', config:actionButtonArgs) => {
    // Perform async tasks, such as validation or API calls
    await new Promise((resolve) => {
      // simulate async operation
      resolve();
    });

    return true; // optionally return true to prevent automatic navigation
  }}
/>
```

--------------------------------

### Extend theme with custom tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/themes/docs/sass.md

Extend the theme with custom tokens by providing a fallback theme and a custom theme map.

```scss
@use '@carbon/themes/scss/themes';
@use '@carbon/themes' with (
  $fallback: themes.$g100,
  $theme: (
    token-01: #000000,
  )
);
```

--------------------------------

### AccordionItem className prop example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Accordion/Accordion.mdx

The className prop passed into AccordionItem is forwarded to the underlying accordion header. Note the callback signature will be ({ isOpen: boolean, event: Event }) rather than the usual (event: Event, state: { isOpen: boolean }) until the next major version.

```jsx
<Accordion>
  <AccordionItem title="Panel A" className="custom-class">
    Panel A
  </AccordionItem>
  <AccordionItem title="Panel B">Panel B</AccordionItem>
  <AccordionItem title="Panel C">Panel C</AccordionItem>
</Accordion>
```

--------------------------------

### Time-only range formatting with dateStyle null

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/dateTimeFormat/README.md

Omits the date component from a date range by setting dateStyle to null, displaying only the time range (e.g., '3:47 – 4:29 PM'). The date can only be omitted if the day is the same between start and end.

```TypeScript
import { dateTimeFormat } from '@carbon/utilities';

dateTimeFormat.absolute.formatRange(startDate, sameDayEndDate, {
  dateStyle: null,
});
// 3:47 – 4:29 PM
```

--------------------------------

### Define custom statement config with connector

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Replaces the default statement options (`if all`, `if any`, `unless all`, `unless any`) with custom ones. Each entry requires `id`, `label`, and `connector` (`'and'` or `'or'`); `secondaryLabel` is optional and shown below the primary label in the picker popover.

```js
const statementConfigCustom = [
  { id: 'if', connector: 'and', label: 'if' },
  {
    id: 'exclIf',
    connector: 'or',
    label: 'excl. if',
    secondaryLabel: 'Excludes matching rows',
  },
];
```

--------------------------------

### Import Add icon

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Import an icon component from the @carbon/react/icons entrypoint.

```tsx
import { Add } from '@carbon/react/icons';

function MyComponent() {
  return <Add />;
}
```

--------------------------------

### Import a pictogram component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/pictograms-react/README.md

Import a pictogram component by its name.

```jsx
import { Airplane } from '@carbon/pictograms-react';
```

--------------------------------

### Intercept add with onAddItem

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Use the onAddItem callback to intercept additions to the ConditionBuilder. Return { preventAdd: true } to block the addition, for example to enforce a maximum number of conditions per group. The callback receives { type, state, group } where type is 'condition', 'subgroup', or 'group'.

```jsx
<ConditionBuilder
  onAddItem={({ type, state, group }) => {
    // Limit to 5 conditions per group
    if (type === 'condition' && group?.conditions?.length >= 5) {
      return { preventAdd: true };
    }
    return { preventAdd: false };
  }}
/>
```

--------------------------------

### Various attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-dropdown.md

Rendered HTML when the dropdown has various attributes: disabled, expanded, and helper text. Shows the menu body and disabled helper text.

```html
<label
  class="cds--label cds--label--disabled"
  hidden=""
  part="title-text"
>
  <slot name="title-text">
  </slot>
</label>
<div
  class="cds--dropdown cds--list-box cds--list-box--disabled cds--list-box--expanded cds--list-box--md"
  role="listbox"
>
  <div
    aria-controls="menu-body"
    aria-expanded="true"
    aria-haspopup="listbox"
    aria-labelledby="trigger-label"
    aria-owns="menu-body"
    class="cds--list-box__field"
    part="trigger-button"
    role="button"
    tabindex="0"
  >
    <span
      class="cds--list-box__label"
      id="trigger-label"
    >
    </span>
    <div
      class="cds--list-box__menu-icon cds--list-box__menu-icon--open"
      id="trigger-caret"
    >
    </div>
  </div>
  <slot name="slug">
  </slot>
  <div
    aria-label=""
    class="cds--list-box__menu"
    id="menu-body"
    part="menu-body"
    role="listbox"
    tabindex="-1"
  >
    <slot>
    </slot>
  </div>
</div>
<div
  class="cds--form__helper-text cds--form__helper-text--disabled"
  part="helper-text"
>
  <slot name="helper-text">
    helper-text-foo
  </slot>
</div>
<div
  aria-live="assertive"
  aria-relevant="additions text"
  class="cds--assistive-text"
  role="status"
>
</div>

```

--------------------------------

### React component package structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0009-ibm-products-to-core-migration.md

Directory layout for a migrated React component in the Carbon monorepo, including source, Storybook, tests, and styles.

```text
packages/react/src/components/<ComponentName>/
├── ComponentName.tsx          ← main component (TypeScript + forwardRef)
├── ComponentName.mdx          ← Storybook docs page
├── ComponentName.stories.js   ← Storybook stories
├── ComponentName-test.js      ← jest/RTL unit tests
├── index.ts                   ← re-exports component + types
├── constants.js               ← (optional) shared constants / enums
└── hooks/                     ← (optional) component-specific hooks

packages/styles/scss/components/<component-name>/
├── _index.scss                ← @forward + @use + emit mixin call
└── _<component-name>.scss     ← @mixin with BEM styles
```

--------------------------------

### $prefix variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Specifies the prefix used for CSS selectors. Default is `'cds'`.

```APIDOC
## `$prefix` variable

### Description
Specifies the prefix used for CSS selectors. Default is `'cds'`.

### Type
`String`

### Default
`'cds'`

### Usage
```scss
@use '@carbon/grid' with ($prefix: 'my-prefix');
```
```

--------------------------------

### Overriding the $prefix variable

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Shows how to set a custom prefix by configuring the @carbon/styles module.

```scss
@use '@carbon/styles' with (
  $prefix: 'my-prefix'
);
```

--------------------------------

### Basic Card usage with subcomponents

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Card/Card.mdx

Shows the basic structure of a Card with its subcomponents: Card.Header, Card.Title, Card.Body, and Card.Footer. The Card component is imported from '@carbon/react'.

```jsx
import { Card } from '@carbon/react';

function Example() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Card title</Card.Title>
      </Card.Header>
      <Card.Body>
        <p>Card body content.</p>
      </Card.Body>
      <Card.Footer>
        <Button kind="tertiary" size="md">
          Action
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

--------------------------------

### Add a new spacing token to layout.tokens.json

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/layout/tokens/README.md

Place the token inside the correct group object in layout.tokens.json. This example adds a spacing token with a value of 12rem (192px). On the next build, it generates `$spacing-14: 12rem !default;` in `_spacing.scss` and `export const spacing14 = '12rem';` in `layout-tokens.js`.

```json
"spacing": {
  "spacing-14": {
    "$type": "dimension",
    "$value": { "value": 12, "unit": "rem" },
    "$description": "Spacing token — 192px."
  }
}
```

--------------------------------

### Specifying a query selector for primary focus

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.mdx

Sets the DOM element that gets focus when the modal opens by specifying a query selector via the selectorPrimaryFocus prop. The comment explains that '.cds--text-input' selects the <input> inside <TextInput>.

```jsx
{
  /* `.cds--text-input` selects the `<input>` in `<TextInput>` */
}
<ComposedModal selectorPrimaryFocus=".cds--text-input">
  <ModalBody hasForm>
    <TextInput labelText="Enter something" />
  </ModalBody>
</ComposedModal>;
```

--------------------------------

### Import CreateSidePanel components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/CreateSidePanel/CreateSidePanel.mdx

Import the required Carbon React components for building the CreateSidePanel pattern: SidePanel, Form, TextInput, Dropdown, FormGroup, and Button.

```jsx
import { SidePanel } from '@carbon/react';
import { Form, TextInput, Dropdown, FormGroup, Button } from '@carbon/react';
```

--------------------------------

### Import dropdown components in JavaScript

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/README.md

Import the dropdown and dropdown-item component modules to register them for use in HTML.

```javascript
import '@carbon/web-components/es/components/dropdown/dropdown.js';
import '@carbon/web-components/es/components/dropdown/dropdown-item.js';
```

--------------------------------

### Checkbox onChange prop signature update

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

The `onChange` prop now passes the event as the first argument and an object containing `checked` and `id` as the second argument. Previously it passed `(boolean, string, Event)`. Update your handler accordingly.

```diff
<Checkbox
-  onChange={(checked, id, event) => {
-    //
-  }}
+  onChange={(event, { checked, id }) => {
+    //
+  }}
/>
```

--------------------------------

### Migrate to pure class and defineCustomElement

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Migrate to a pure class with a static `is` field and explicit registration via `defineCustomElement`. This is how Carbon's web components are authored in v3. `defineCustomElement` defaults the tag to `clazz.is` and the registry to the global `customElements`; it is idempotent and returns the registered class.

```diff
- import { carbonElement as customElement } from '@carbon/web-components/es/globals/decorators/carbon-element.js';
+ import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';

- @customElement('my-component')
  class MyComponent extends LitElement {
+   static is = 'my-component';
    // ...
  }
+ defineCustomElement(MyComponent);
```

--------------------------------

### Using contentRenderer with single step (InterstitialScreenView)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Return a single InterstitialScreenView from contentRenderer for a single-step interstitial.

```jsx
<InterstitialScreen.Body
  contentRenderer={() => (
    <InterstitialScreenView>Content</InterstitialScreenView>
  )}
/>
```

--------------------------------

### Provide help description with aria-describedby

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Provide a help description for the ConditionBuilder by passing the description element's id via aria-describedby. The component spreads additional HTML attributes onto its root element. Use cds--visually-hidden to hide the description visually unless visible instructions are needed.

```jsx
<p id="condition-builder-desc" className="cds--visually-hidden">
  Use this builder to create filter conditions. Each condition has three parts:
  a property (what to filter on), an operator (how to compare), and a value.
  Available properties are: Continent, Region, Price, and Date.
  Use arrow keys to navigate between conditions and cells.
  Press Enter or Space to open a selector. Press Escape to close without saving.
</p>

<ConditionBuilder
  aria-describedby="condition-builder-desc"
  inputConfig={inputConfig}
  onChange={handleConditionChange}
  startConditionLabel="Add condition"
/>
```

--------------------------------

### Custom sortItems to move selected items to bottom

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/multi-select/multi-select.mdx

Overrides the sortItems property to move selected items to the bottom of the list. The custom function uses getItemValue to extract item values and compareItems for alphabetical sorting of non-selected items. This example is used when selection-feedback is set to 'top' or 'top-after-reopen'.

```typescript
const getItemValue = (item: Node) =>
  item instanceof Element ? (item.getAttribute('value') ?? '') : '';

const customSortItems = (
  menuItems: NodeList,
  {
    values,
    compareItems,
    locale,
  }: {
    values: string[];
    compareItems: (
      itemA: string,
      itemB: string,
      options: { locale: string }
    ) => number;
    locale: string;
  }
) => {
  const menuItemsArray = Array.from(menuItems);

  return menuItemsArray.sort((itemA, itemB) => {
    const hasItemA = values.includes(getItemValue(itemA));
    const hasItemB = values.includes(getItemValue(itemB));

    if (hasItemA && !hasItemB) {
      return 1;
    }
    if (hasItemB && !hasItemA) {
      return -1;
    }

    return compareItems(
      itemA.textContent?.trim() ?? '',
      itemB.textContent?.trim() ?? '',
      { locale }
    );
  });
};

...

<cds-multi-select .sortItems=${customSortItems}>
  <!-- items -->
</cds-multi-select>
```

--------------------------------

### Coachmark code sample

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Coachmark/Coachmark.mdx

Basic Coachmark usage with a beacon trigger and content. The trigger element or first child of Coachmark should always be either a CoachmarkBeacon or a Button.

```jsx
<Theme theme="white">
  <Coachmark
    position={{ x: 151, y: 155 }}
    open={isOpen}
    onClose={handleClose}
    launcherButtonRef={beaconButtonRef}>
    <CoachmarkBeacon
      label="Show information"
      buttonProps={{
        id: 'CoachmarkBtn',
        ref: beaconButtonRef,
        onClick: handleBeaconClick,
      }}
    />
    <Coachmark.Content aria-label="Coachmark content">
      <Coachmark.ContentHeader
        closeIconDescription="Close"
        dragIconDescription="Drag"
        dragAriaLabel="Coachmark is being dragged"
      />
      <Coachmark.ContentBody>
        <h2>Hello World</h2>
        <p>this is a description test</p>
        <Button size="sm">Done</Button>
      </Coachmark.ContentBody>
    </Coachmark.Content>
  </Coachmark>
</Theme>
```

--------------------------------

### Tag the release commit

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Create an annotated tag for the release version, e.g., v11.2.0, on the release commit.

```bash
git tag -a v11.2.0 -m 'v11.2.0'
```

--------------------------------

### Square all corners then round last child with Sass mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Button/Button.mdx

Omit the base radius and set only the corners that differ. This example squares every action in a dialog footer, then rounds the last action's end-end corner to follow the container.

```scss
.my-dialog-footer {
  @include button.radius(border-radius.$border-radius-00);
}

.my-dialog-footer > :last-child {
  @include button.radius($ee: calc(#{border-radius.$border-radius-08} - 1px));
}
```

--------------------------------

### Push the release tag to upstream

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/release.md

Push the created tag to the upstream remote to trigger the Release Workflow.

```bash
git push upstream v11.2.0
```

--------------------------------

### Import Tabs components from @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tabs/Tabs.mdx

Import the necessary Tabs components from the Carbon React package to build dismissable tabs.

```js
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
```

--------------------------------

### Tooltip with interactive child in v11

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

In v11, the Tooltip component adds a tooltip to any interactive child element passed to it. The label prop specifies the tooltip content and must not contain interactive content; use Toggletip for interactive content.

```jsx
import { Tooltip } from '@carbon/react';

function ExampleComponent() {
  return (
    <Tooltip label="Close">
      <button type="button">X</button>
    </Tooltip>
  );
}
```

--------------------------------

### Navigation card with as="a"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Card/Card.mdx

Use as="a" with href when the card navigates to another page. This renders a native <a> element giving users right-click, Cmd+click, and screen-reader link semantics.

```jsx
<Card clickable as="a" href="/dashboard" aria-label="Go to dashboard">
  <Card.Header>
    <Card.Title>Dashboard</Card.Title>
  </Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

--------------------------------

### cds-layout-constraint size constraints example

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/layout/layout.mdx

Demonstrates using cds-layout-constraint to override a child component's size preferences. Here, cds-icon-button (which supports all sizes and defaults to lg) is constrained to sm->lg with a default of md, matching the cds-content-switcher's supported range.

```html
<div>
  <cds-layout-constraint size-default="md" size-min="sm" size-max="lg">
    <!-- cds-icon-button is now locked to the sizes sm->lg and defaults to md -->
    <cds-icon-button></cds-icon-button>
  </cds-layout-constraint>
</div>
```

--------------------------------

### cds-menu-item basic usage with shortcut and disabled

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/menu/menu.mdx

Renders a basic menu item with optional shortcut hint and disabled state. The shortcut is only displayed, not registered in the browser. Use @cds-item-opened and @cds-item-closed events to handle menu open/close.

```html
<cds-menu
  open
  @cds-item-opened="${handleMenuOpen}"
  @cds-item-closed="${handleMenuClose}">
  <cds-menu-item label="Cut" shortcut="⌘X"></cds-menu-item>
  <cds-menu-item label="Copy" shortcut="⌘C"></cds-menu-item>
  <cds-menu-item label="Paste" shortcut="⌘V" disabled></cds-menu-item>
</cds-menu>
```

--------------------------------

### Apply fluid type token with type-style() mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v11.md

When migrating to v11, fluid tokens require a second parameter set to true in the type-style() mixin. The diff shows replacing the deprecated 'expressive-heading-04' token with 'fluid-heading-04' and adding the fluid flag.

```diff
- @include type.type-style('expressive-heading-04');
+ @include type.type-style('fluid-heading-04', true);
```

--------------------------------

### Run codemod to migrate StaticNotification to Callout

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Notification/stories/StaticNotification.mdx

Run this codemod to automatically update usages of StaticNotification to Callout in your project.

```bash
npx @carbon/upgrade migrate refactor-to-callout --write
```

--------------------------------

### Basic Grid with Column lg={4}

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/Grid.mdx

Use this snippet to create a simple grid with four columns, each spanning 4 columns at the large breakpoint. The default grid has 16 columns. Import Grid and Column from '@carbon/react'.

```jsx
import { Grid, Column } from '@carbon/react';

function MyComponent() {
  return (
    <Grid>
      <Column lg={4}>Span 4 of 16</Column>
      <Column lg={4}>Span 4 of 16</Column>
      <Column lg={4}>Span 4 of 16</Column>
      <Column lg={4}>Span 4 of 16</Column>
    </Grid>
  );
}
```

--------------------------------

### Submenu with nested MenuItems

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Menu/Menu.mdx

Shows how to create a submenu by passing MenuItem subcomponents as children of a MenuItem. The 'Import' item expands to reveal nested items.

```jsx
<Menu open>
  <MenuItem label="Open" />
  <MenuItem label="Save" />
  <MenuItem label="Import">
    <MenuItem label="Image" />
    <MenuItem label="Movie" />
    <MenuItem label="Text" />
  </MenuItem>
</Menu>
```

--------------------------------

### Updating form state with StepInstance.updateFormState

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/utilities/step-flow/step-flow.mdx

Uses `StepInstance.updateFormState` to save form state within the step instance. The example clones the current form state, updates the email field from an input event, and assigns it back to the instance for use in later steps or submission.

```ts
@customElement('my-stepped-component')
export class MySteppedComponent extends LitElement {
  private _stepInfo = new StepInstance(this);

  connectedCallback() {
    super.connectedCallback();
    this._stepInfo.updateTotalStepCount = 3;
  }

  private _handleEmailInput(e: Event) {
    const savedFormState = structuredClone(
      this._stepInfo.data.formState
    ) as FormStateType;
    savedFormState.email = (e.target as HTMLInputElement).value;
    this._stepInfo.updateFormState = savedFormState;
  }

  render() {
    const { totalSteps, currentStep } = this._stepInfo.data;
    return html`
      <cds-tearsheet
        class="step-tearsheet-with-util"
        selector-primary-focus="#tearsheet-story-text-input-a"
        ?open=${this._open}
        variant="wide"
        prevent-close-on-click-outside>
        <cds-tearsheet-body>
          <div slot="main-content">
            ${currentStep === 0
              ? html` <cds-text-input
                  label="Email"
                  id="tearsheet-story-text-input-a"
                  value=${this._email}
                  @input="${this._handleEmailInput}"></cds-text-input>`
              : nothing}
            ${currentStep === 1 ? html`step 2` : nothing}
            ${currentStep === 2 ? html`step 3` : nothing}
            ${currentStep === 3 ? html`step 4` : nothing}
          </div>
        </cds-tearsheet-body>
      </cds-tearsheet>
    `;
  }
}
```

--------------------------------

### layout.use generated CSS with max

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows the local CSS custom property emitted when a maximum size is provided.

```scss
.my-component {
  @include layout.use('size', $default: 'md', $max: 'lg');
}
```

```scss
.my-component {
  --cds-layout-size-height-local: clamp(
    var(--cds-layout-size-height-min),
    var(--cds-layout-size-height, var(--cds-layout-size-height-md)),
    min(var(--cds-layout-size-height-max), var(--cds-layout-size-height-lg))
  );
}
```

--------------------------------

### Sass: Configure prefix with @use '@carbon/react'

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ClassPrefix/ClassPrefix.mdx

Customize the prefix in Sass by using the @use rule with the $prefix option.

```scss
@use '@carbon/react' with (
  $prefix: 'custom'
);
```

--------------------------------

### Minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-dropdown.md

Rendered HTML when the dropdown has minimum attributes. Shows the label, trigger button, and helper text structure.

```html
<label
  class="cds--label"
  hidden=""
  part="title-text"
>
  <slot name="title-text">
  </slot>
</label>
<div
  class="cds--dropdown cds--list-box cds--list-box--md"
  role="listbox"
>
  <div
    aria-controls="menu-body"
    aria-expanded="false"
    aria-haspopup="listbox"
    aria-labelledby="trigger-label"
    aria-owns="menu-body"
    class="cds--list-box__field"
    part="trigger-button"
    role="button"
    tabindex="0"
  >
    <span
      class="cds--list-box__label"
      id="trigger-label"
    >
    </span>
    <div
      class="cds--list-box__menu-icon"
      id="trigger-caret"
    >
    </div>
  </div>
  <slot name="slug">
  </slot>
</div>
<div
  class="cds--form__helper-text"
  hidden=""
  part="helper-text"
>
  <slot name="helper-text">
  </slot>
</div>
<div
  aria-live="assertive"
  aria-relevant="additions text"
  class="cds--assistive-text"
  role="status"
>
</div>

```

--------------------------------

### Footer Actions Using Custom Buttons

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

Use this HTML to define footer actions with custom buttons. This approach gives you full control over the footer layout, but you must handle button sizing manually.

```html
<cds-tearsheet-footer slot="footer">
  <cds-button kind="ghost">Cancel</cds-button>
  <cds-button kind="secondary">Back</cds-button>
  <cds-button kind="primary">Submit</cds-button>
</cds-tearsheet-footer>
```

--------------------------------

### Override Carbon theme CSS custom property (--cds-interactive-02)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/styling.md

Changes to CSS Custom Properties of the Carbon theme are reflected in the color scheme of web components. The example sets the `--cds-interactive-02` token to the `g100` theme value, affecting the button color inside the footer.

```css
footer {
  --cds-interactive-02: #6f6f6f; /* `$interactive-02` token for `g100` theme */
}
```

--------------------------------

### Import Grid Components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/grid/grid.mdx

Import the grid and column components from @carbon/web-components. This is the first step to using the grid components.

```js
import '@carbon/web-components/es/components/grid/index';
```

--------------------------------

### Popover with autoalign and align="top-right"

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/popover/autoalign.mdx

Use this snippet to render a popover with the experimental `align` prop set to `top-right`, which places the popover above the trigger and aligns the caret to the right edge. The `autoalign` attribute enables automatic alignment adjustments. This example includes a trigger icon and popover content with a title and details.

```html
<cds-popover open="" autoalign caret="" align="top-right" dropshadow="">
  <div class="playground-trigger"><svg focusable="false" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 32 32"><path d="M26,4H6A2,2,0,0,0,4,6V26a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2V6A2,2,0,0,0,26,4ZM6,26V6H26V26Z"></path></svg></div>
  <cds-popover-content align="top-right" dropshadow="" open="" slot="content" caret="">
    <div class="p-3">
      <p class="popover-title">Available storage</p>
      <p class="popover-details">
        This server has 150 GB of block storage remaining.
      </p>
    </div>
  </cds-popover-content>
</cds-popover>
```

--------------------------------

### Enable v12 OverflowMenu with feature flag

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/overflow-menu/overflow-menu.feature-flag.mdx

Enables the v12 overflow menu with the `enable-v12-overflowmenu` feature flag. Requires a direct `cds-menu` child and imports the feature-flags and overflow-menu modules.

```html
import '@carbon/web-components/es/components/feature-flags/index.js'; import
'@carbon/web-components/es/components/overflow-menu/index.js';

<feature-flags enable-v12-overflowmenu="true">
  <cds-overflow-menu label="Primary action">
    <cds-menu>
      <cds-menu-item label="Stop app"></cds-menu-item>
      <cds-menu-item label="Restart app"></cds-menu-item>
      <cds-menu-item label="Rename app"></cds-menu-item>
      <cds-menu-item label="Edit routes and access"></cds-menu-item>
      <cds-menu-item-divider></cds-menu-item-divider>
      <cds-menu-item label="Delete app" kind="danger"></cds-menu-item>
    </cds-menu>
  </cds-overflow-menu>
</feature-flags>
```

--------------------------------

### Run a specific transform

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/transforms/ARCHITECTURE.md

Use this command to run a specific transform on a file path. Replace <name> with the transform filename and 'path/to/file' with the target file.

```bash
yarn jscodeshift -t transforms/<name>.js 'path/to/file'
```

--------------------------------

### Create a CSS Grid in HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

HTML structure for a CSS Grid using the cds--css-grid and cds--css-grid-column classes with column spans.

```html
<div class="cds--css-grid">
  <div class="cds--css-grid-column cds--col-span-4">Span 4 columns</div>
  <div class="cds--css-grid-column cds--col-span-2">Span 2 columns</div>
</div>
```

--------------------------------

### Commit all staged changes with --no-verify

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Commit all staged changes with the --no-verify flag to work around a known bug with pre-commit hooks on Windows GitHub Desktop.

```bash
git commit -am "commit message" --no-verify
```

--------------------------------

### Basic WebTerminal implementation with provider and content wrapper

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/WebTerminal/WebTerminal.mdx

Wrap the area that launches or renders the terminal in WebTerminalProvider, use useWebTerminal() to toggle the terminal from navigation, and pass your own terminal implementation as children to WebTerminal. Optionally use WebTerminalContentWrapper to let the main content respond to the open terminal state.

```jsx
const AppNavigation = () => {
  const { toggleWebTerminal } = useWebTerminal();

  return (
    <HeaderGlobalAction aria-label="Web terminal" onClick={toggleWebTerminal}>
      <Terminal size={20} />
    </HeaderGlobalAction>
  );
};

const App = () => (
  <WebTerminalProvider>
    <AppNavigation />
    <WebTerminalContentWrapper>
      <PageContent />
    </WebTerminalContentWrapper>
    <WebTerminal closeIconDescription="Close terminal">
      <YourTerminalComponent />
    </WebTerminal>
  </WebTerminalProvider>
);
```

--------------------------------

### Use type-scale mixin to set font-size

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Use the type-scale mixin to set font-size directly, e.g., step 4.

```scss
@use '@carbon/type';

.my-selector {
  @include type.type-scale(4);
}
```

--------------------------------

### inputConfig prop structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Defines the `inputConfig` prop with a `properties` array. Each entry specifies a selectable field with an `id`, `label`, optional `icon`, `type`, optional `description`, and type-specific `config`.

```js
inputConfig: {
  properties: [
    {
      id: 'continent',        // unique identifier — stored in condition state
      label: 'Continent',     // display label shown in the property picker
      icon: Earth,            // optional Carbon icon component
      type: 'option',         // input type — see types below
      description: 'Filter by continent', // optional tooltip on the property button
      config: { ... },        // type-specific config — see below
    },
  ],
}
```

--------------------------------

### Migrate to Lit's customElement decorator

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md

Replace the removed carbonElement decorator with Lit's customElement decorator. Only the import changes; all usage sites remain the same. Note that Lit's decorator throws a NotSupportedError on duplicate registration, unlike Carbon's which logged a warning.

```diff
- import { carbonElement as customElement } from '@carbon/web-components/es/globals/decorators/carbon-element.js';
+ import { customElement } from 'lit/decorators.js';

  @customElement('my-component')
  class MyComponent extends LitElement {
    // ...
  }
```

--------------------------------

### Commit specific files with --no-verify

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Add a specific file and commit it with the --no-verify flag to work around the pre-commit hook bug.

```bash
git add file_name
```

```bash
git commit -m "commit message" --no-verify
```

--------------------------------

### Importing V10 compatibility theme tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/examples/v10-token-compat-in-v11/README.md

Use this Sass import to pull in compatibility tokens for color when working with Carbon V11.

```scss
@use '@carbon/react/scss/compat/theme';
```

--------------------------------

### Include @carbon/grid in Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/README.md

Include the grid in your Sass files by using @use and emitting the flex-grid styles.

```scss
@use '@carbon/grid';

// Emit the flex-grid styles
@include grid.flex-grid();
```

--------------------------------

### Rebuild and Update Snapshots for Pictograms

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run these commands when pictograms changed to rebuild the relevant packages and update snapshots.

```bash
yarn lerna run build --scope='@carbon/pictograms-react' --include-dependencies
```

```bash
yarn test:e2e -u
```

--------------------------------

### Render the expando button in multi line mode

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-code-snippet.md

Snapshot of the expand/collapse button rendered in multi-line mode. The button has class 'cds--snippet-btn--expand' and contains a span with id 'button-text' that includes a slot for 'expand-button-text' with default text 'expand-button-text-foo'.

```html
<button
  class="cds--snippet-btn--expand"
  type="button"
>
  <span
    class="cds--snippet-btn--text"
    id="button-text"
  >
    <slot name="expand-button-text">
      expand-button-text-foo
    </slot>
  </span>
</button>
```

--------------------------------

### SassDoc mixin annotation template

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/style.md

Template for documenting a mixin with SassDoc, including description, @access, and @group annotations.

```scss
/// <Details about the mixin>
/// @access <public|private>
/// @group <name-of-group>
@mixin my-component {
  // ...
}
```

--------------------------------

### Build affected packages with yarn lerna run build

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/reviewing-pull-requests.md

Use this command to build only the affected packages during local testing. Replace {packageName} with the actual package name. Run yarn and yarn build first to update dependencies and build artifacts.

```bash
yarn lerna run build --scope='@carbon/{packageName}' --include-dependencies
```

--------------------------------

### Default table markup

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/data-table/index.html

HTML structure for a default data table with columns for Name and Status, and rows for Load Balancer 1, 2, and 3.

```html
<cds-table>
  <cds-table-header>
    <cds-table-row>
      <cds-table-header-cell>Name</cds-table-header-cell>
      <cds-table-header-cell>Status</cds-table-header-cell>
    </cds-table-row>
  </cds-table-header>
  <cds-table-body>
    <cds-table-row>
      <cds-table-cell>Load Balancer 1</cds-table-cell>
      <cds-table-cell>Disabled</cds-table-cell>
    </cds-table-row>
    <cds-table-row>
      <cds-table-cell>Load Balancer 2</cds-table-cell>
      <cds-table-cell>Starting</cds-table-cell>
    </cds-table-row>
    <cds-table-row>
      <cds-table-cell>Load Balancer 3</cds-table-cell>
      <cds-table-cell>Active</cds-table-cell>
    </cds-table-row>
  </cds-table-body>
</cds-table>
```

--------------------------------

### Using contentRenderer with multiple steps

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Pass a callback to contentRenderer that returns multiple InterstitialScreenView wrappers, each with a stepTitle prop. The number of steps is inferred from the number of children returned.

```jsx
<InterstitialScreen.Body
  contentRenderer={({ handleGotoStep, progStep, disableActionButton }) => (
    <>
      <InterstitialScreenView stepTitle="Step 1">
        Content for Step 1
      </InterstitialScreenView>
      <InterstitialScreenView stepTitle="Step 2">
        Content for Step 2
      </InterstitialScreenView>
    </>
  )}
/>
```

--------------------------------

### Minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Rendered HTML when the component is used with no attributes set. Shows the default structure with an aria-expanded="false" button, an empty title slot, and a menu body slot.

```html
<button
  aria-expanded="false"
  aria-haspopup="true"
  class="cds--side-nav__submenu"
  part="expando"
  type="button"
>
  <div
    class="cds--side-nav__icon"
    hidden=""
    id="title-icon-container"
    part="title-icon-container"
  >
    <slot name="title-icon">
    </slot>
  </div>
  <span
    class="cds--side-nav__submenu-title"
    part="title"
  >
  </span>
  <div
    class="cds--side-nav__icon cds--side-nav__icon--small cds--side-nav__submenu-chevron"
    part="expando-icon-container"
  >
  </div>
</button>
<ul
  class="cds--side-nav__menu"
  part="menu-body"
>
  <slot>
  </slot>
</ul>
```

--------------------------------

### layout.use

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

A mixin that emits local CSS custom properties for all properties in a layout group. It should be included on the outermost selector of a component, with the group name and a default value required.

```APIDOC
## layout.use

### Description
A mixin that emits local CSS custom properties for all properties in a layout group. It should be included on the outermost selector of a component, with the group name and a default value required.

### Usage
```scss
@use '@carbon/styles/scss/utilities/layout';

.my-component {
  // minimal required setup, provide the requested property and a default
  @include layout.use('size', $default: 'md');

  // optionally provide a minimum size for the component
  @include layout.use('size', $default: 'md', $min: 'sm');

  // optionally provide a maximum size for the component
  @include layout.use('size', $default: 'md', $max: 'lg');

  // optionally provide both a minimum and maximum size for the component
  @include layout.use('size', $default: 'md', $min: 'sm', $max: 'lg');
}
```

### Parameters
- **group** (string) - Required - The layout group name (e.g., 'size', 'density').
- **$default** (string) - Required - The default step value (e.g., 'md').
- **$min** (string) - Optional - The minimum step value.
- **$max** (string) - Optional - The maximum step value.

### Generated CSS Custom Properties
For the 'size' group, the mixin generates a `--cds-layout-size-height-local` custom property using `clamp()`. The exact output depends on the provided parameters:

- With only `$default`: `clamp(var(--cds-layout-size-height-min), var(--cds-layout-size-height, var(--cds-layout-size-height-md)), var(--cds-layout-size-height-max))`
- With `$min`: `clamp(max(var(--cds-layout-size-height-min), var(--cds-layout-size-height-sm)), var(--cds-layout-size-height, var(--cds-layout-size-height-md)), var(--cds-layout-size-height-max))`
- With `$max`: `clamp(var(--cds-layout-size-height-min), var(--cds-layout-size-height, var(--cds-layout-size-height-md)), min(var(--cds-layout-size-height-max), var(--cds-layout-size-height-lg)))`
- With both `$min` and `$max`: `clamp(max(var(--cds-layout-size-height-min), var(--cds-layout-size-height-sm)), var(--cds-layout-size-height, var(--cds-layout-size-height-md)), min(var(--cds-layout-size-height-max), var(--cds-layout-size-height-lg)))`
```

--------------------------------

### Use built-in g100 theme

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Configures the Carbon theme to use the built-in g100 theme by importing the themes entrypoint and setting the theme variable.

```scss
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme' with (
  $theme: themes.$g100
);
```

--------------------------------

### Enable v12 OverflowMenu API migration only

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Runs the OverflowMenu codemod without FeatureFlags wrapping. Use this when the app already uses FeatureFlags at the root.

```bash
npx @carbon/upgrade migrate enable-v12-overflowmenu --wrapWithFeatureFlag=false --write
```

--------------------------------

### Uncontrolled seed with value prop

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Pre-populates the builder with an existing set of conditions without onChange. The builder owns its state after the first render. With at least one group and startActive true (default), it renders immediately; pass startActive={false} to keep the "Add condition" button visible.

```jsx
<ConditionBuilder
  inputConfig={inputConfig}
  value={{
    operator: 'or',
    groups: [
      {
        id: 'g1',
        statement: 'ifAll',
        groupOperator: 'and',
        conditions: [
          {
            id: 'c1',
            property: 'continent',
            operator: 'is',
            value: { id: 'Asia', label: 'Asia' },
          },
        ],
      },
    ],
  }}
/>
```

--------------------------------

### $grid-gutter-condensed variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Specifies the gutter of the condensed grid. Default is `1px`.

```APIDOC
## `$grid-gutter-condensed` variable

### Description
Specifies the gutter of the condensed grid. Default is `1px`.

### Type
`Number`

### Default
`1px`

### Usage
```scss
@use '@carbon/grid' with ($grid-gutter-condensed: 2px);
```
```

--------------------------------

### Extend base configuration in .eslintrc

Source: https://github.com/carbon-design-system/carbon/blob/main/config/eslint-config-carbon/README.md

Use the base or vanilla configuration if you want to exclude React.js rules.

```json
{
  "extends": ["eslint-config-carbon/base"]
}
```

--------------------------------

### Render with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-inline-notification.md

Snapshot of the cds-inline-notification component rendered with no attributes, showing the default structure with slots for title, subtitle, and default content, plus a close button.

```html
<div class="cds--inline-notification__details">
  <div class="cds--inline-notification__text-wrapper">
    <p class="cds--inline-notification__title">
      <slot name="title">
      </slot>
    </p>
    <div class="cds--inline-notification__subtitle">
      <slot name="subtitle">
      </slot>
    </div>
    <slot>
    </slot>
  </div>
</div>
<button
  class="cds--inline-notification__close-button"
  type="button"
>
</button>
```

--------------------------------

### Icon library package folder structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/building-an-icon-library.md

Shows the expected folder layout for an icon library package in the Carbon Elements project, including output directories for ESM, CommonJS, and UMD modules.

```text
icon-library-package-name
├── README.md
├── es              # Output directory for ESM
├── examples        # Examples directory for showing usage in projects
├── lib             # Output directory for CommonJS modules
├── package.json
├── src
├── tasks
│   └── build.js    # Build task for generating the icon library
└── umd             # Output directory for UMD modules
```

--------------------------------

### layout.use generated CSS with min and max

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows the local CSS custom property emitted when both minimum and maximum sizes are provided.

```scss
.my-component {
  @include layout.use('size', $default: 'md', $min: 'sm', $max: 'lg');
}
```

```scss
.my-component {
  --cds-layout-size-height-local: clamp(
    max(var(--cds-layout-size-height-min), var(--cds-layout-size-height-sm)),
    var(--cds-layout-size-height, var(--cds-layout-size-height-md)),
    min(var(--cds-layout-size-height-max), var(--cds-layout-size-height-lg))
  );
}
```

--------------------------------

### Carbon grid (CSS grid) CDN links

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.mdx

Includes Carbon grid using CSS grid and all corresponding grid classes. Provides links for a specific version and the NEXT tag.

```html
// SPECIFIC VERSION
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/web-components/version/[v2.x.y]/cssgrid.css" />

// NEXT tag
<link
  rel="stylesheet"
  href="https://1.www.s81c.com/common/carbon/web-components/tag/next/cssgrid.css" />
```

--------------------------------

### Import AddSelectData and AddSelectItem

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Import the main classes from the @carbon/utilities package. This is the entry point for using the utility.

```typescript
import { AddSelectData, AddSelectItem } from '@carbon/utilities';
```

--------------------------------

### $grid-gutter variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Specifies the gutter of the grid. Default is `32px (2rem)`.

```APIDOC
## `$grid-gutter` variable

### Description
Specifies the gutter of the grid. Default is `32px (2rem)`.

### Type
`Number`

### Default
`32px (2rem)`

### Usage
```scss
@use '@carbon/grid' with ($grid-gutter: 24px);
```
```

--------------------------------

### Import EditInPlace component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/edit-in-place/edit-in-place.mdx

Import the EditInPlace web component module to register the custom element.

```javascript
import '@carbon/web-components/es/components/edit-in-place/index.js';
```

--------------------------------

### Use toString and toSVG with icon descriptors

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Import icon definitions from @carbon/icons and use toString or toSVG to render them, optionally overriding attributes.

```js
import { IconName } from '@carbon/icons';
import { toString, toSVG } from '@carbon/icon-helpers';

const iconString = toString(IconName);
const iconSVG = toSVG({
  ...IconName,
  attrs: {
    ...IconName.attrs,
    myCustomAttribute: 'myCustomAttributeValue',
  },
});
```

--------------------------------

### cds-menu-item with submenu slot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/menu/menu.mdx

Demonstrates creating a submenu by passing a cds-menu-item-radio-group to the 'submenu' slot of a cds-menu-item. The submenu appears when the parent item is opened.

```html
<cds-menu open>
  <cds-menu-item label="Open"></cds-menu-item>
  <cds-menu-item label="Save"></cds-menu-item>
  <cds-menu-item label="Import">
    <cds-menu-item-radio-group slot="submenu" label="import list">
      <cds-menu-item label="None"></cds-menu-item>
      <cds-menu-item label="Product team"></cds-menu-item>
      <cds-menu-item label="Organization"></cds-menu-item>
      <cds-menu-item label="Company"></cds-menu-item>
    </cds-menu-item-radio-group>
  </cds-menu-item>
</cds-menu>
```

--------------------------------

### cds-progress-step various attributes rendered HTML

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-progress-step.md

Rendered output when the cds-progress-step component is used with various attributes, including a secondary label text slot that displays 'secondary-label-text-foo'.

```html
<div
  class="cds--progress-step-button"
  tabindex="0"
>
  <slot name="label-text">
    <p
      aria-describedby="label-tooltip"
      class="cds--progress-label"
      role="button"
      title="First step"
    >
      First step
    </p>
  </slot>
  <slot name="secondary-label-text">
    <p class="cds--progress-optional">
      secondary-label-text-foo
    </p>
  </slot>
  <span class="cds--progress-line">
  </span>
</div>
```

--------------------------------

### Rebuild @carbon/styles after changes

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

After making changes in @carbon/styles, rebuild the package. Run 'yarn build' from the packages/styles directory, or run the lerna command from the repository root.

```bash
yarn build
```

```bash
yarn lerna run build --scope='@carbon/styles'
```

--------------------------------

### Finished status snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-inline-loading.md

Rendered HTML when the status is finished, showing an empty animation container and the text slot.

```html
<div class="cds--inline-loading__animation">
</div>
<p class="cds--inline-loading__text">
  <slot>
  </slot>
</p>

```

--------------------------------

### Replace Carbon typeface with custom font via Sass configuration

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Configure the Sass entrypoint before any other @use of Carbon Sass modules to disable Carbon's Plex @font-face generation and override the root font-family definitions. $font-families is not merged with defaults, so include every family key your compiled styles need. Then supply your own @font-face rules to load replacement font assets.

```scss
@use 'sass:string';

@use '@carbon/styles' with (
  // Turn off Carbon's Plex `@font-face` generation
  $css--font-face: false,

  // Change the root `font-family` definition(s)
  $font-families:
    (
      'sans':
        string.unquote(
          "'Inter Local', system-ui, -apple-system, BlinkMacSystemFont, '.SFNSText-Regular', sans-serif"
        ),
      'mono':
        string.unquote(
          "'IBM Plex Mono', system-ui, -apple-system, BlinkMacSystemFont, '.SFNSText-Regular', monospace"
        ),
      'serif':
        string.unquote(
          "'IBM Plex Serif', system-ui, -apple-system, BlinkMacSystemFont, '.SFNSText-Regular', serif"
        ),
      // Include any other Carbon font family keys your application compiles.
    )
);
```

```scss
@font-face {
  font-display: swap;
  font-family: 'Inter Local';
  font-style: normal;
  font-weight: 400;
  src: url('./fonts/inter-latin-400-normal.woff2') format('woff2');
}

@font-face {
  font-display: swap;
  font-family: 'Inter Local';
  font-style: normal;
  font-weight: 600;
  src: url('./fonts/inter-latin-600-normal.woff2') format('woff2');
}
```

--------------------------------

### Enable fluid type style

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Pass true as the second argument to type-style to enable fluid styles for type styles that support it.

```scss
@use '@carbon/type';

@include type.type-style('token-name', true);
```

--------------------------------

### cds-header-menu minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Rendered HTML for the header menu with minimum attributes. Includes a trigger link with aria-expanded false and a menu body with a slot.

```html
<a
  aria-expanded="false"
  aria-haspopup="menu"
  class="cds--header__menu-item cds--header__menu-title"
  href="javascript:void 0"
  part="trigger"
  role="button"
  tabindex="0"
>
</a>
<ul
  class="cds--header__menu"
  part="menu-body"
>
  <slot>
  </slot>
</ul>
```

--------------------------------

### AI Label with action bar

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Shows how to add an action bar at the bottom of the AI Label callout. Actions are added as children with the slot="actions" attribute, and a dedicated action button is included.

```html
<cds-ai-label>
  {Content Here}
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(View16, { slot: 'icon' })}
    <span slot="tooltip-content"> View </span>
  </cds-icon-button>
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(FolderOpen16, { slot: 'icon' })}
    <span slot="tooltip-content"> Open folder</span>
  </cds-icon-button>
  <cds-icon-button kind="ghost" slot="actions" size="lg">
    ${iconLoader(Folders16, { slot: 'icon' })}
    <span slot="tooltip-content"> Folders </span>
  </cds-icon-button>
  <cds-ai-label-action-button>View details</cds-ai-label-action-button>
</cds-ai-label>
```

--------------------------------

### Extend stylelint-config-carbon in .stylelintrc

Source: https://github.com/carbon-design-system/carbon/blob/main/config/stylelint-config-carbon/README.md

Extend the Carbon stylelint configuration by adding it to the extends array in a .stylelintrc file.

```json
{
  "extends": ["stylelint-config-carbon"]
}
```

--------------------------------

### Tearsheet usage with header, influencer, body, and footer

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tearsheet/Tearsheet.mdx

Full Tearsheet composition with header actions, navigation bar, influencer panel, body with main and summary content, and footer actions. Requires the Tearsheet and StackProvider imports from '@carbon/react'.

```jsx
import { Tearsheet, StackProvider } from '@carbon/react';

<Tearsheet open={open} onClose={handleClose}>
  <Tearsheet.Header>
    <Tearsheet.HeaderContent
      label="Optional label"
      title="Title"
      description="Description"
      headerActions={
        <Tearsheet.HeaderActions
          menuButtonProps={{ label: 'Actions', kind: 'tertiary' }}>
          <Tearsheet.HeaderActionItem overflowItemLabel="Action 1">
            <Button kind="tertiary" size="sm">
              Action 1
            </Button>
          </Tearsheet.HeaderActionItem>
        </Tearsheet.HeaderActions>
      }
    />
    {/* Optional: ProgressIndicator, notifications, etc. */}
    <Tearsheet.NavigationBar scroller={<Tearsheet.ScrollButton />}>
      {/* TabList, tags, or other navigation elements */}
    </Tearsheet.NavigationBar>
  </Tearsheet.Header>

  <Tearsheet.Influencer>
    {/* Left panel — vertical progress indicator, steps, etc. */}
  </Tearsheet.Influencer>

  <Tearsheet.Body>
    <Tearsheet.MainContent>{/* Primary content */}</Tearsheet.MainContent>
    <Tearsheet.SummaryContent>
      {/* Right panel — summary details or related information */}
    </Tearsheet.SummaryContent>
  </Tearsheet.Body>

  <Tearsheet.Footer
    actions={[
      { kind: 'ghost', label: 'Cancel', onClick: () => setOpen(false) },
      { kind: 'secondary', label: 'Back' },
      { kind: 'primary', label: 'Submit', onClick: handleSubmit },
    ]}
  />
</Tearsheet>;
```

--------------------------------

### Using @carbon/motion in Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/motion/docs/sass.md

Import the @carbon/motion package and use the motion mixin or function to set transition timing functions, or use the duration variable directly.

```scss
@use '@carbon/motion';

.selector {
  // Set `transition-timing-function` directly
  @include motion.motion(standard, productive);

  // Alternatively
  transition: opacity motion.motion(standard, productive);

  // Or use a duration
  transition: opacity motion.$duration-fast-01;
}
```

--------------------------------

### Import path change for preview date picker

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Shows the required import path change when migrating from the classic Carbon Web Components date picker to the preview version. The preview registers from the 'next' module path instead of the root date-picker index.

```diff
- import '@carbon/web-components/es/components/date-picker/index.js';
+ import '@carbon/web-components/es/components/date-picker/next/index.js';
```

--------------------------------

### SCSS: Min constraint utility class

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

CSS custom property pattern for the min constraint class. It sets the minimum property value to the step value.

```scss
.cds--layout-constraint--group__min-step {
  // for each property in this group:
  --cds-layout-group-property-min: var(
    --cds-layout-group-property-step,
    step-value
  );
}
```

--------------------------------

### Managing menuTarget prop with React Refs

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/MenuButton/MenuButton.mdx

Shows how to dynamically set the menuTarget prop using a ref and state, because React doesn't re-render when ref.current changes. The menu will render inside the container div.

```tsx
const Component = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<HTMLDivElement | undefined>(undefined);
  useEffect(() => {
    if (containerRef.current) {
      setTarget(containerRef.current);
    }
  }, []);
  return (
    <div ref={containerRef}>
      <MenuButton label="Actions" menuTarget={target}>
        <MenuItem label="First action" />
      </MenuButton>
    </div>
  );
};
```

--------------------------------

### cds-combo-box minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-combo-box.md

Rendered DOM structure for the cds-combo-box with minimum attributes. Shows the default classes, hidden label and helper text, and empty input placeholder.

```html
<label
  class="cds--label"
  hidden=""
  part="title-text"
>
  <slot name="title-text">
  </slot>
</label>
<div
  class="cds--combo-box cds--dropdown cds--list-box cds--list-box--md"
  role="listbox"
>
  <div
    aria-controls="menu-body"
    aria-expanded="false"
    aria-haspopup="listbox"
    aria-labelledby="trigger-label"
    aria-owns="menu-body"
    class="cds--list-box__field"
    part="trigger-button"
  >
    <input
      aria-autocomplete="list"
      aria-controls="menu-body"
      aria-label=""
      class="cds--text-input cds--text-input--empty"
      id="trigger-label"
      placeholder=""
      role="combobox"
    >
    <div
      class="cds--list-box__menu-icon"
      id="trigger-caret"
    >
    </div>
  </div>
  <slot name="slug">
  </slot>
</div>
<div
  class="cds--form__helper-text"
  hidden=""
  part="helper-text"
>
  <slot name="helper-text">
  </slot>
</div>
<div
  aria-live="assertive"
  aria-relevant="additions text"
  class="cds--assistive-text"
  role="status"
>
</div>

```

--------------------------------

### Import Carbon components for API key generation

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/GenerateAnAPIKey/GenerateAnAPIKey.mdx

Import the required Carbon React components for building the Generate an API key pattern. This import is used in the Overview section.

```jsx
import { Button, Modal, TextInput, PasswordInput } from '@carbon/react';
```

--------------------------------

### Lint code with yarn lint

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-vue/examples/vue-cli/README.md

Lints the codebase.

```bash
yarn lint
```

--------------------------------

### cds-selectable-tile minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-selectable-tile with minimum attributes. The input is a checkbox with tabindex '-1' and the label has class 'cds--tile cds--tile--selectable'.

```html
<input
  class="cds--tile-input"
  id="input"
  tabindex="-1"
  type="checkbox"
>
<label
  class="cds--tile cds--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="cds--tile__checkmark cds--tile__checkmark--persistent">
  </div>
  <div class="cds--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### Using contentRenderer with single step (div)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Return a plain div from contentRenderer for a single-step interstitial.

```jsx
<InterstitialScreen.Body contentRenderer={() => <div>Content</div>} />
```

--------------------------------

### Create Abstract Modal State Manager

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.mdx

An abstract version of a state manager component that handles the rendering of launcher content and modal content via props.

```jsx
const ModalStateManager = ({
  renderLauncher: LauncherContent,
  children: ModalContent,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!ModalContent || typeof document === 'undefined'
        ? null
        : ReactDOM.createPortal(
            <ModalContent open={open} setOpen={setOpen} />,
            document.body
          )}
      {LauncherContent && <LauncherContent open={open} setOpen={setOpen} />}
    </>
  );
};
```

--------------------------------

### Import @carbon/elements and use a variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/docs/sass.md

Import the @carbon/elements package and use a Sass variable from it. The package re-exports from other packages that make up the IBM Design Language.

```scss
@use '@carbon/elements';

.selector {
  background: elements.$blue-50;
}

```

--------------------------------

### Import Coachmark Components (JavaScript)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/coachmark/coachmark.mdx

Import the necessary modules for the coachmark component, its beacon, button, and an icon. Required before using the custom elements in HTML.

```javascript
import '@carbon/web-components/es/components/coachmark/index.js';
import '@carbon/web-components/es/components/coachmark/coachmark-beacon/index.js';
import '@carbon/web-components/es/components/button/index.js';
import Crossroads from '@carbon/icons/es/crossroads/16.js';
```

--------------------------------

### Minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Rendered HTML when the component has no attributes set. The anchor has the base class 'cds--side-nav__link' and an empty href, with a span containing a slot for the title.

```html
<a
  class="cds--side-nav__link"
  href=""
  part="link"
>
  <span
    class="cds--side-nav__link-text"
    part="title"
  >
    <slot>
    </slot>
  </span>
</a>
```

--------------------------------

### Footer Actions Using .actions Property

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

Use this HTML to define footer actions via the `.actions` property. This approach automatically handles button sizing based on the tearsheet variant and screen size. The actions array includes objects with `kind`, `label`, and optional `onClick`.

```html
<cds-tearsheet-footer
  slot="footer"
  .actions="${[
    {
      kind: 'ghost',
      label: 'Cancel',
      onClick: () => setOpen(false),
    },
    {
      kind: 'secondary',
      label: 'Back',
    },
    {
      kind: 'primary',
      label: 'Submit',
    },
  ]}">
</cds-tearsheet-footer>
```

--------------------------------

### Using the icon prop with carbon-icons

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Icon/migrate-to-7.x.md

Import the Icon component from carbon-components-react and an icon from carbon-icons, then pass the icon as the icon prop. This replaces the removed name prop and enables tree-shaking.

```js
import { Icon } from 'carbon-components-react';
import { iconAdd } from 'carbon-icons';

<Icon icon={iconAdd} />;
```

--------------------------------

### Replace date-picker element tags

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

Update all date-picker tags to the new preview variants.

```diff
- <cds-date-picker>
-   <cds-date-picker-input kind="single" label-text="Date" placeholder="mm/dd/yyyy">
-   </cds-date-picker-input>
- </cds-date-picker>
+ <cds-preview-date-picker>
+   <cds-preview-date-picker-input kind="single" label-text="Date" placeholder="mm/dd/yyyy">
+   </cds-preview-date-picker-input>
+ </cds-preview-date-picker>
```

--------------------------------

### JavaScript to open modal on button click

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/modal/index.html

Opens the modal by setting the 'open' property to true when the button is clicked.

```javascript
document.getElementById('modal-example-button').addEventListener('click', () => {
  document.getElementById('modal-example').open = true;
});
```

--------------------------------

### Import Button component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Import a component directly from the @carbon/react package.

```tsx
import { Button } from '@carbon/react';

function MyComponent() {
  return <Button>Example usage</Button>;
}
```

--------------------------------

### Render with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-radio-button.md

Shows the HTML output when the cds-radio-button is rendered with only the required attributes. The input has class 'cds--radio-button', id 'input', tabindex '-1', type 'radio', and value 'staging'. The label includes a span for the appearance and a slot for the label text.

```html
<input
  class="cds--radio-button"
  id="input"
  tabindex="-1"
  type="radio"
  value="staging"
>
<label
  class="cds--radio-button__label"
  for="input"
>
  <span class="cds--radio-button__appearance">
  </span>
  <span>
    <slot>
    </slot>
  </span>
</label>
```

--------------------------------

### Increase ulimit for build process

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/setup/windows.md

Increase Linux OS limits to avoid build errors: ulimit -l increases maximum locked memory, ulimit -n increases maximum open files.

```bash
ulimit -l 65536
```

```bash
ulimit -n 1048576
```

--------------------------------

### cds-file-uploader-item with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/file-uploader.md

Rendered output for the cds-file-uploader-item component with various attributes. The form requirement is visible (no hidden attribute) while the supplement remains hidden.

```html
<p class="cds--file-filename">
  <slot>
  </slot>
</p>
<span class="cds--file__state-container">
  <cds-loading
    assistive-text="Delete this file"
    type="small"
  >
  </cds-loading>
</span>
<div class="cds--form-requirement">
  <div class="cds--form-requirement__title">
  </div>
  <p
    class="cds--form-requirement__supplement"
    hidden=""
  >
  </p>
</div>
```

--------------------------------

### time property with timeZones

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Configures a `time` property. Supply the list of available time zone strings via `config.timeZones`. The stored value format is `"HH:MM AM/PM TIMEZONE"` (e.g. `"10:30 AM IST"`).

```js
{
  id: 'time',
  label: 'Time',
  type: 'time',
  config: { timeZones: ['IST', 'CET', 'UTC', 'LOCAL'] },
}
```

--------------------------------

### Unknown status snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-inline-loading.md

Rendered HTML when the status is unknown, showing only the text slot without animation.

```html
<p class="cds--inline-loading__text">
  <slot>
  </slot>
</p>

```

--------------------------------

### Basic StepInstance usage with LitElement

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/utilities/step-flow/step-flow.mdx

Initializes a StepInstance by passing `this` to the constructor so mutations trigger requestUpdate(). Sets the total step count to 3 in connectedCallback and accesses step data via `this._stepInfo.data` to render step content conditionally.

```ts
@customElement('my-stepped-component')
export class MySteppedComponent extends LitElement {
  // Pass `this` so mutations trigger requestUpdate() on this element.
  private _stepInfo = new StepInstance(this);

  connectedCallback() {
    super.connectedCallback();
    this._stepInfo.updateTotalStepCount = 3;
  }

  render() {
    const { totalSteps, currentStep } = this._stepInfo.data;
    return html`
      <cds-tearsheet
        class="step-tearsheet-with-util"
        selector-primary-focus="#tearsheet-story-text-input-a"
        ?open=${this._open}
        variant="wide"
        prevent-close-on-click-outside>
        <cds-tearsheet-body>
          <div slot="main-content">
            ${currentStep === 0 ? html`step 1` : nothing}
            ${currentStep === 1 ? html`step 2` : nothing}
            ${currentStep === 2 ? html`step 3` : nothing}
            ${currentStep === 3 ? html`step 4` : nothing}
          </div>
        </cds-tearsheet-body>
      </cds-tearsheet>
    `;
  }
}
```

--------------------------------

### Render minimum attributes for <a>

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-btn.md

Renders an anchor element with the minimum required attributes: class, href, id, part, role, and type. The class includes the base button class and the large and primary variants.

```html
<a
  class="cds--btn cds--btn--lg cds--btn--primary"
  href="about:blank"
  id="button"
  part="button"
  role="button"
  type="button"
>
  <slot>
  </slot>
  <slot name="icon">
  </slot>
</a>
```

--------------------------------

### Override multiple component tokens via theme mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Define overrides for multiple component tokens, merge them into the existing tokens with utilities.merge, and register them with theme.add-component-tokens. Then call theme.theme() for each theme class to apply the new values.

```scss
@use '@carbon/react/scss/themes';
@use '@carbon/react/scss/theme';
@use '@carbon/react/scss/components/button/tokens' as button-tokens;
@use '@carbon/themes/scss/utilities';
@use '@carbon/react';

// Set new token values. Follow this format, each theme has a specification
$button-token-overrides: (
  button-primary: (
    fallback: #3f51b5,
    values: (
      (
        theme: themes.$white,
        value: #3f51b5,
      ),
      (
        theme: themes.$g10,
        value: #3fb557,
      ),
      (
        theme: themes.$g90,
        value: #3f9ab5,
      ),
      (
        theme: themes.$g100,
        value: #ab3fb5,
      ),
    ),
  ),
);

// The new tokens must be merged into the existing tokens
$button-tokens: utilities.merge(
  button-tokens.$button-tokens,
  $button-token-overrides
);

// Add the new component tokens which will be included any time the theme mixin is called
@include theme.add-component-tokens($button-tokens);

// Ensure that the theme() mixin is called to set the new token values
// You can override the existing `.cds--{theme}` classes for each theme
:root {
  @include theme.theme();
}

.cds--g10 {
  @include theme.theme(themes.$g10);
}

.cds--g90 {
  @include theme.theme(themes.$g90);
}

.cds--g100 {
  @include theme.theme(themes.$g100);
}
```

--------------------------------

### Import WebTerminal pattern components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/WebTerminal/WebTerminal.mdx

Import the WebTerminal pattern components and Carbon header components to build the terminal pattern. Copy the pattern files from the example/components directory into your project as indicated by the comment.

```jsx
// Copy the pattern files from the example/components directory into your project
import {
  WebTerminal,
  WebTerminalProvider,
  WebTerminalContentWrapper,
  useWebTerminal,
} from './components'; // path to your copied pattern files
import {
  Header,
  HeaderName,
  HeaderGlobalAction,
  HeaderGlobalBar,
} from '@carbon/react';
import { Terminal } from '@carbon/react/icons';
```

--------------------------------

### Update import for PasswordInput

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/docs/migration/11.x-namespaced-exports.md

Update the import statement to use the new direct export instead of the namespaced one.

```diff
- import { TextInput } from 'carbon-components-react';
+ import { PasswordInput } from 'carbon-components-react';
```

--------------------------------

### cds-menu-item

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/menu/menu.mdx

Renders a basic menu item with a label and optional shortcut hint. It can be clicked unless disabled, and supports a danger kind for destructive actions.

```APIDOC
## cds-menu-item

### Description
Renders a basic menu item with a label and optional shortcut hint. It can be clicked unless disabled, and supports a danger kind for destructive actions.

### Attributes
- **label** (string) - Required - The text label for the menu item.
- **shortcut** (string) - Optional - A shortcut hint displayed next to the label (not registered in the browser).
- **disabled** (boolean) - Optional - When present, the menu item is not clickable.
- **kind** (string) - Optional - Set to `"danger"` to highlight the item on hover/focus for destructive actions.

### Slots
- **render-icon** - Optional - Slot for an icon to be rendered inside the menu item.
- **submenu** - Optional - Slot for a submenu (e.g., a `cds-menu-item-radio-group`) to be rendered as a submenu.

### Example
```html
<cds-menu open>
  <cds-menu-item label="Cut" shortcut="⌘X"></cds-menu-item>
  <cds-menu-item label="Copy" shortcut="⌘C"></cds-menu-item>
  <cds-menu-item label="Paste" shortcut="⌘V" disabled></cds-menu-item>
</cds-menu>
```
```

--------------------------------

### $grid-breakpoints variable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Specifies the breakpoints for the grid. Default is a map of breakpoints.

```APIDOC
## `$grid-breakpoints` variable

### Description
Specifies the breakpoints for the grid. Default is a map of breakpoints.

### Type
`Map`

### Default
A map of breakpoints (e.g., `sm`, `md`, `lg`, `xlg`, `max`).

### Usage
```scss
@use '@carbon/grid' with ($grid-breakpoints: (sm: 320px, md: 672px, lg: 1056px, xlg: 1312px, max: 1584px));
```
```

--------------------------------

### Include styles for a specific component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/README.md

Use this Sass import to include styles for a specific component, such as the button.

```scss
@use '@carbon/react/scss/components/button';
```

--------------------------------

### AILabel `kind`

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Documentation for the `kind` property of the AI Label component.

```APIDOC
## AILabel `kind`

### Description
Sets the kind (variant) of the AI Label button.

### Usage
```html
<cds-ai-label kind="default"></cds-ai-label>
```
```

--------------------------------

### breakpoint mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Generates a media query for a given breakpoint, alias of `breakpoint-up`.

```APIDOC
## `breakpoint` mixin

### Description
Generates a media query for a given breakpoint, alias of `breakpoint-up`.

### Parameters
- `$name` (String) - Required - The name of the breakpoint.

### Usage
```scss
@include breakpoint('md') {
  // styles for md and up
}
```
```

--------------------------------

### Render cds-table-expand-row with minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/data-table.md

Rendered markup for cds-table-expand-row with minimum attributes, showing an expand button and a slot.

```html
<div class="cds--table-expand">
  <button class="cds--table-expand__button">
  </button>
</div>
<slot>
</slot>

```

--------------------------------

### Using the `as` prop with a custom component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

You can also provide a custom component to the `as` prop. The custom component should accept all props passed to it, like a class name for the column.

```jsx
import { FlexGrid, Row, Column } from '@carbon/react';

function Article({ children, ...rest }) {
  return <article {...rest}>{children}</article>;
}

function CustomColumn({ children, ...rest }) {
  return <Column as={Article} {...rest}>{children}</Column:
}

function MyComponent() {
  return (
    <FlexGrid>
      <Row>
        <CustomColumn>Example content</Column>
        <CustomColumn>Example content</Column>
        <CustomColumn>Example content</Column>
        <CustomColumn>Example content</Column>
      </Row>
    <FlexGrid>
  );
}
```

--------------------------------

### Link local @carbon/styles with yarn link

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/developer-handbook.md

Run from the consuming project to link your local @carbon/styles workspace. The yarn link command adds a resolutions entry in the consuming project's manifest and points @carbon/styles to the workspace on your filesystem.

```bash
yarn link /path/to/carbon/packages/styles
```

--------------------------------

### Min/Max Date Constraints Configuration

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/date-picker/primitives/README.md

Configures a single-mode date picker with min and max date constraints. Dates outside the range are visually disabled, not clickable, and prevented from selection by guards.

```typescript
const machine = new DatePickerStateMachine({
  mode: 'single',
  minDate: new Date('2024-01-01'),
  maxDate: new Date('2024-12-31'),
});

// Dates before 2024-01-01 or after 2024-12-31 will be:
// - Visually disabled (grayed out)
// - Not clickable
// - Prevented from selection by guards
```

--------------------------------

### Using @carbon/type Sass mixins

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/docs/sass.md

Import the @carbon/type package and include the reset, default-type, and type-classes mixins. Then apply a specific type style using the type-style mixin with a token like 'productive-heading-01'.

```scss
@use '@carbon/type';

// Include type reset
@include type.reset();

// Include default type styles, targets h1, h2, h3, etc
@include type.default-type();

// Include utility classes for type-related properties
@include type.type-classes();

.selector {
  // Include a type style
  @include type.type-style('productive-heading-01');
}
```

--------------------------------

### Dynamic Action Rendering with PageHeader

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Demonstrates using function rendering for contentActions and pageActions to conditionally display actions based on the component's scroll state.

```jsx
<PageHeader.Root
  onContentActionsClipped={(clipped) =>
    console.log('Actions clipped:', clipped)
  }>
  <PageHeader.BreadcrumbBar
    // Function rendering: show actions only when clipped
    contentActions={({ contentActionsClipped }) =>
      contentActionsClipped ? (
        <PageHeader.ContentPageActions
          menuButtonLabel="Actions"
          actions={actionItems}
        />
      ) : null
    }
    pageActions={breadcrumbPageActions}>
    <Breadcrumb>
      <BreadcrumbItem href="/#">Breadcrumb 1</BreadcrumbItem>
      <BreadcrumbItem href="#">Breadcrumb 2</BreadcrumbItem>
    </Breadcrumb>
  </PageHeader.BreadcrumbBar>

  <PageHeader.Content
    title="Page Title"
    // Function rendering: hide actions when fully collapsed
    pageActions={({ fullyCollapsed }) =>
      !fullyCollapsed ? (
        <PageHeader.ContentPageActions
          menuButtonLabel="Actions"
          actions={actionItems}
        />
      ) : null
    }>
    <PageHeader.ContentText subtitle="Subtitle">
      Page description text
    </PageHeader.ContentText>
  </PageHeader.Content>
</PageHeader.Root>
```

--------------------------------

### Per-family font path structure

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/ibm-plex.md

Shows the font path structure when using per-family configuration. Note that $font-path is suffixed with the family, e.g., -sans.

```text
<$font-path>-sans/fonts/complete/woff2/IBMPlexSans-Bold.woff2
```

--------------------------------

### layout.use mixin with optional min/max

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Include on the outermost selector of a component to emit local CSS custom properties for the passed layout group. Requires the group name and a default; optionally provide a minimum and/or maximum size.

```scss
@use '@carbon/styles/scss/utilities/layout';

.my-component {
  // minimal required setup, provide the requested property and a default
  @include layout.use('size', $default: 'md');

  // optionally provide a minimum size for the component
  @include layout.use('size', $default: 'md', $min: 'sm');

  // optionally provide a maximum size for the component
  @include layout.use('size', $default: 'md', $max: 'lg');

  // optionally provide both a minimum and maximum size for the component
  @include layout.use('size', $default: 'md', $min: 'sm', $max: 'lg');
}
```

--------------------------------

### Define a token with a literal value

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/colors.md

Shows a typical token export with a literal value. This is the normal way to define a token before considering re-exporting from another theme.

```js
export const hoverSelectedUI = 'some-value';
```

--------------------------------

### Import colors from @carbon/elements

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/elements/README.md

Imports the colors export from @carbon/elements, which re-exports all package exports.

```javascript
import { colors } from '@carbon/elements';
```

--------------------------------

### breakpoint-between mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Generates a media query for the range between the lower and upper breakpoints.

```APIDOC
## `breakpoint-between` mixin

### Description
Generates a media query for the range between the lower and upper breakpoints.

### Parameters
- `$lower` (String) - Required - The name of the lower breakpoint.
- `$upper` (String) - Required - The name of the upper breakpoint.

### Usage
```scss
@include breakpoint-between('sm', 'lg') {
  // styles for sm to lg
}
```
```

--------------------------------

### breakpoint-down mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/docs/sass.md

Generates a media query that applies below the maximum width of the given breakpoint.

```APIDOC
## `breakpoint-down` mixin

### Description
Generates a media query that applies below the maximum width of the given breakpoint.

### Parameters
- `$name` (String) - Required - The name of the breakpoint.

### Usage
```scss
@include breakpoint-down('lg') {
  // styles for below lg
}
```
```

--------------------------------

### cds-preview-date-picker-input

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

The input component for the preview date picker. It supports various attributes for styling, validation, and state, including color scheme, disabled, invalid, label, kind, placeholder, read-only, required, size, type, value, and warning states.

```APIDOC
## Component: cds-preview-date-picker-input

### Description
The input component for the preview date picker. It supports various attributes for styling, validation, and state, including color scheme, disabled, invalid, label, kind, placeholder, read-only, required, size, type, value, and warning states.

### Attributes/Properties
- `color-scheme` (string) - Color scheme variant
- `disabled` (boolean) - Disable the input
- `hide-label` (boolean) - Hide the label text
- `invalid` (boolean) - Show invalid state
- `invalid-text` (string) - Invalid state message
- `kind` (string) - Input type (`simple`, `single`, `from`, `to`)
- `label-text` (string) - Label text
- `pattern` (string) - Input validation pattern
- `placeholder` (string) - Placeholder text
- `readonly` (boolean) - Make input read-only
- `required` (boolean) - Mark as required field
- `short` (boolean) - Use short variant
- `size` (string) - Input size (`sm`, `md`, `lg`)
- `type` (string) - Input type
- `value` (string) - Input value
- `warn` (boolean) - Show warning state
- `warn-text` (string) - Warning state message
```

--------------------------------

### Import with CommonJS

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-react/README.md

Imports an icon using CommonJS syntax. This is useful for Node.js environments or bundlers that use CommonJS.

```js
const { Add } = require('@carbon/icons-react');
```

--------------------------------

### number property with min, step, unit

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ConditionBuilder/ConditionBuilder.mdx

Configures a `number` property. Accepts standard Carbon `NumberInputProps` via `config`, plus `min`, `max`, `step`, and `unit` (a display string appended to the stored value).

```js
{
  id: 'price',
  label: 'Price',
  type: 'number',
  config: { min: 0, step: 1, unit: 'Dollars' },
}
```

--------------------------------

### Basic Tearsheet.Header with HeaderActions and NavigationBar

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Tearsheet/Tearsheet.mdx

Shows a Tearsheet.Header with HeaderContent, HeaderActions containing a HeaderActionItem with a Button, and a NavigationBar with a ScrollButton. The headerActions prop accepts a ReactNode and positions action buttons before the AI label and close button.

```jsx
<Tearsheet.Header>
  <Tearsheet.HeaderContent
    {...headerContentProps}
    headerActions={
      <Tearsheet.HeaderActions>
        <Tearsheet.HeaderActionItem overflowItemLabel="Action 1">
          <Button kind="tertiary" size="sm">
            Action 1
          </Button>
        </Tearsheet.HeaderActionItem>
      </Tearsheet.HeaderActions>
    }
  />
  <Tearsheet.NavigationBar scroller={<Tearsheet.ScrollButton />} />
</Tearsheet.Header>
```

--------------------------------

### Render with minimum attributes for inline mode

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-code-snippet.md

Snapshot of the cds-code-snippet component in inline mode with minimum attributes. Uses a cds-copy element with button-class-name 'cds--snippet cds--snippet--inline', a code slot for the icon, and a tooltip-content span with 'Copy to Clipboard'.

```html
<cds-copy button-class-name="cds--snippet cds--snippet--inline">
  <code slot="icon">
    <slot>
    </slot>
  </code>
  <span slot="tooltip-content">
    Copy to Clipboard
  </span>
</cds-copy>
```

--------------------------------

### cds-pagination minimum attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-pagination.md

Rendered output of cds-pagination with minimum attributes. The backward button is disabled and has the class cds--pagination__button--no-index, and the items count shows 'Item 1–10'.

```html
<div class="cds--pagination__left">
  <slot name="page-sizes-select">
  </slot>
  <div class="cds-ce--pagination__divider">
  </div>
  <span class="cds--pagination__items-count cds--pagination__text">
    Item 1–10
  </span>
</div>
<div class="cds-ce--pagination__divider">
</div>
<div class="cds--pagination__right">
  <slot>
  </slot>
  <div class="cds--pagination__control-buttons">
    <button
      class="cds--pagination__button cds--pagination__button--backward cds--pagination__button--no-index"
      disabled=""
      title="Previous page"
    >
    </button>
    <button
      class="cds--pagination__button cds--pagination__button--forward"
      title="Next page"
    >
    </button>
  </div>
</div>
```

--------------------------------

### Configure includePaths for Sass

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Set the includePaths option to an array of locations where Sass should look for node_modules folders. This is required for most teams.

```json
{
  "includePaths": ["node_modules"]
}
```

--------------------------------

### Per-corner radius for split button (CSS and SCSS)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Shows how to use per-corner radius properties to create a split button with a rounded base and square joined sides. The CSS version uses custom properties (--cds-button-radius-se, --cds-button-radius-ee, --cds-button-radius-ss, --cds-button-radius-es) while the SCSS version uses the button.radius mixin with named arguments. Per-corner properties override the base --cds-button-radius for that corner.

```css
.my-split-primary {
  --cds-button-radius: 999999px; /* $border-radius-max */
  --cds-button-radius-se: 0;
  --cds-button-radius-ee: 0;
}

.my-split-trigger {
  --cds-button-radius: 999999px;
  --cds-button-radius-ss: 0;
  --cds-button-radius-es: 0;
}
```

```scss
@use '@carbon/styles/scss/components/button';
@use '@carbon/styles/scss/border-radius';

.my-split-primary {
  @include button.radius(
    border-radius.$border-radius-max,
    $se: border-radius.$border-radius-00,
    $ee: border-radius.$border-radius-00
  );
}

.my-split-trigger {
  @include button.radius(
    border-radius.$border-radius-max,
    $ss: border-radius.$border-radius-00,
    $es: border-radius.$border-radius-00
  );
}
```

--------------------------------

### cds-radio-tile various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-radio-tile with various attributes. The input has name and value attributes, and the label has class 'cds--tile--light'.

```html
<input
  class="cds--tile-input"
  id="input"
  name="name-foo"
  tabindex="-1"
  type="radio"
  value="value-foo"
>
<label
  class="cds--tile cds--tile--light cds--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="cds--tile__checkmark">
  </div>
  <div class="cds--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### cds-clickable-tile minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-clickable-tile with only required attributes. The anchor has class 'cds--link cds--tile cds--tile--clickable', role 'button', and tabindex '0'.

```html
<a
  class="cds--link cds--tile cds--tile--clickable"
  id="link"
  part="link"
  role="button"
  tabindex="0"
>
  <slot>
  </slot>
  <div
    class="cds--link__icon"
    hidden=""
  >
    <slot name="icon">
    </slot>
  </div>
</a>
```

--------------------------------

### AILabel `aiTextLabel`

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Documentation for the `aiTextLabel` property of the AI Label component.

```APIDOC
## AILabel `aiTextLabel`

### Description
Sets the text label for the AI Label button.

### Usage
```html
<cds-ai-label ai-text-label="AI"></cds-ai-label>
```
```

--------------------------------

### Render with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-inline-notification.md

Snapshot of the cds-inline-notification component rendered with title and subtitle attributes, showing the same structure but with the title and subtitle text included in the slots.

```html
<div class="cds--inline-notification__details">
  <div class="cds--inline-notification__text-wrapper">
    <p class="cds--inline-notification__title">
      title-foo
      <slot name="title">
      </slot>
    </p>
    <div class="cds--inline-notification__subtitle">
      subtitle-foo
      <slot name="subtitle">
      </slot>
    </div>
    <slot>
    </slot>
  </div>
</div>
<button
  class="cds--inline-notification__close-button"
  type="button"
>
</button>
```

--------------------------------

### Update PageHeader import path

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Replace the deprecated PageHeader import with the new composable preview__PageHeader alias.

```tsx
// Before — deprecated
import { PageHeader } from '@carbon/ibm-products';

// After — composable preview
import { preview__PageHeader as PageHeader } from '@carbon/ibm-products';
```

--------------------------------

### Basic cds-table markup

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/data-table/stories/data-table.mdx

Basic structure for a Carbon data table using the cds-table component. Requires cds-table-row and cds-table-head components to display rows and column headings.

```html
<cds-table>
  <cds-table-head>
    <cds-table-header-row>
      <cds-table-header-cell>Name</cds-table-header-cell>
      <cds-table-header-cell>Status</cds-table-header-cell>
    </cds-table-header-row>
  </cds-table-head>
  <cds-table-body>
    <cds-table-row>
      <cds-table-cell>Load Balancer 1</cds-table-cell>
      <cds-table-cell>Disabled</cds-table-cell>
    </cds-table-row>
    <cds-table-row>
      <cds-table-cell>Load Balancer 2</cds-table-cell>
      <cds-table-cell>Starting</cds-table-cell>
    </cds-table-row>
    <cds-table-row>
      <cds-table-cell>Load Balancer 3</cds-table-cell>
      <cds-table-cell>Active</cds-table-cell>
    </cds-table-row>
  </cds-table-body>
</cds-table>
```

--------------------------------

### Before and after migration of FeatureFlags props

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/FeatureFlags/overview.mdx

Shows the deprecated `flags` object prop usage and the new individual boolean prop usage after migration.

```jsx
//Before migration

 <FeatureFlags
  flags={{
    'enable-v12-tile-default-icons': true,
  }}>
    <App />
  </FeatureFlags>


//After migration

  <FeatureFlags enableV12TileDefaultIcons>
    <App />
  </FeatureFlags>
```

--------------------------------

### Manage feature flags in JavaScript

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/feature-flags/README.md

Manage feature flags in JavaScript using enable, disable, and merge functions.

```js
import { enable, disable, merge } from '@carbon/feature-flags';

// Enable `feature-flag-a`
enable('feature-flag-a');

// Disable `feature-flag-a`
disable('feature-flag-a');

// Set a variety of feature flags to a specific value
merge({
  'feature-flag-a': true,
  'feature-flag-b': false,
  'feature-flag-c': true,
});
```

--------------------------------

### Enable experimentalAutoAlign on DataTable

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DataTable/DataTable.mdx

Use the experimentalAutoAlign prop on Table to automatically align contents to the top when at least one cell content wraps. This feature is experimental and may not be performant with large datasets.

```jsx
<div style={{ width: '300px' }}>
  <Table experimentalAutoAlign>
    <TableHead>
      <TableRow>
        <TableHeader>Header1</TableHeader>
        <TableHeader>Header2</TableHeader>
        <TableHeader>Header3</TableHeader>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Wrapping content</TableCell>
        <TableCell>content</TableCell>
        <TableCell>content</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

--------------------------------

### Apply the reset mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

Include the optional reset mixin to set top-level properties on html and body, such as font-size, font-family, and text-rendering options, and map the strong tag to semibold.

```scss
@use '@carbon/type';

:root {
  @include type.reset();
}
```

--------------------------------

### Rendered HTML for cds-text-input with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-text-input.md

Expected rendered HTML for the cds-text-input component when rendered with various attributes. Shows the structure with form-item wrapper, label wrapper, field wrapper, input element with helper-text aria-describedby, and a hidden form-requirement slot.

```html
<div class="cds--form-item cds--text-input-wrapper">
  <div class="cds--text-input__label-wrapper">
  </div>
  <div class="cds--text-input__field-outer-wrapper">
    <div class="cds--text-input__field-wrapper">
      <input
        aria-describedby="helper-text"
        class="cds--text-input cds--text-input--md"
        id="input"
        type="text"
      >
    </div>
    <div
      class="cds--form-requirement"
      hidden=""
    >
      <slot name="">
      </slot>
    </div>
  </div>
</div>
```

--------------------------------

### cds-clickable-tile various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-clickable-tile with all attributes set: download, href, hreflang, ping, rel, target, type, and more.

```html
<a
  class="cds--link cds--tile cds--tile--clickable"
  download="file-name-foo"
  href="about:blank"
  hreflang="en"
  id="link"
  part="link"
  ping="about:blank"
  rel="noopener"
  role="button"
  tabindex="0"
  target="_blank"
  type="text/plain"
>
  <slot>
  </slot>
  <div
    class="cds--link__icon"
    hidden=""
  >
    <slot name="icon">
    </slot>
  </div>
</a>
```

--------------------------------

### cds-header-nav-item various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Renders the cds-header-nav-item component with various attributes, including an href.

```html
<a
  class="cds--header__menu-item"
  href="about:blank"
  part="link"
  tabindex="0"
>
  <span
    class="cds--text-truncate--end"
    part="title"
  >
    <slot>
    </slot>
  </span>
</a>

```

--------------------------------

### Horizontal resizer layout (axis="x")

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Declarative horizontal resizing with left and right panels. Uses slot="left", slot="right", and slot="handle-horizontal".

```html
<cds-resizer-grid axis="x">
  <cds-resizer-panel slot="left">Left panel content</cds-resizer-panel>

  <cds-resizer-handle slot="handle-horizontal"></cds-resizer-handle>

  <cds-resizer-panel slot="right">Right panel content</cds-resizer-panel>
</cds-resizer-grid>
```

--------------------------------

### PageHeader.TabBar component usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Shows how to use PageHeader.TabBar with TabList and Tab children inside the PageHeader.Root and Tabs wrapper.

```APIDOC
## PageHeader.TabBar Component

### Description
Use the `PageHeader.TabBar` component to render the Tabs zone. Pass `TabList` and `Tab` components as children. Place `TabPanels` and `TabPanel` components outside the `PageHeader`, wrapping all within the `Tabs` component.

### Example
```jsx
<Tabs>
  <PageHeader.Root>
    ...
    <PageHeader.TabBar>
      <TabList>
        <Tab>Dashboard</Tab>
        <Tab>Monitoring</Tab>
        <Tab>Activity</Tab>
        <Tab>Settings</Tab>
      </TabList>
    </PageHeader.TabBar>
  </PageHeader.Root>
  <TabPanels>
    <TabPanel>Dashboard Tab Panel</TabPanel>
    <TabPanel>Monitoring Tab Panel</TabPanel>
    <TabPanel>Activity Tab Panel</TabPanel>
    <TabPanel>Settings Tab Panel</TabPanel>
  </TabPanels>
</Tabs>
```

### Tags prop

The `PageHeader.TabBar` component accepts a `tags` prop expecting a react node. You can pass any node to handle overflowing logic on your own, or use the `PageHeader.TagOverflow` sub-component which handles overflow logic and provides render props for customizing the overflow/operational tag and popover content.

#### Example with tags and custom overflow
```jsx
const tags = [
  <Tag type="blue" id="example-tag-1">Tag 1</Tag>,
  <Tag type="purple" id="example-tag-2">Tag 2</Tag>,
  <Tag type="red" id="example-tag-3">Tag 3</Tag>,
  <OperationalTag type="blue" id="example-tag-4" text="Tag 4" />,
  <Tag type="purple" id="example-tag-5">Tag 5</Tag>,
  <Tag type="red" id="example-tag-6">Tag 6</Tag>,
];

return (
  <Tabs>
    <PageHeader.Root>
      <PageHeader.TabBar
        tags={
          <PageHeader.TagOverflow
            renderOverflowTag={(
              hiddenItems,
              handleOverflowClick,
              openPopover,
              triggerId
            ) => (
              <OperationalTag
                id={triggerId}
                onClick={handleOverflowClick}
                aria-expanded={openPopover}
                text={`+${hiddenItems.length}`}
              />
            )}
            renderPopoverContent={(hiddenItems) => {
              return hiddenItems.map((i, index) => {
                const foundJSXTag = tabBarTags.find((c) => c.props.id === i.id);
                return cloneElement(foundJSXTag, {
                  id: `cloned-tag-node-id-${index}`,
                  key: `cloned-tag-key-${index}`,
                });
              });
            }}>
            {tags}
          </PageHeader.TagOverflow>
        }>
        <TabList>
          <Tab>Tab 1</Tab>
          ...
        </TabList>
      </PageHeader.TabBar>
    </PageHeader.Root>
    <TabPanels>
      <TabPanel>Tab Panel 1</TabPanel>
      ...
    </TabPanels>
  </Tabs>
);
```
```

--------------------------------

### Import an icon component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icons-react/README.md

Imports an icon component by name. This is the basic import statement for using icons in your project.

```jsx
import { Add } from '@carbon/icons-react';
```

--------------------------------

### Edit In Place Properties

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/edit-in-place/edit-in-place.mdx

Lists all configurable properties of the Edit In Place component, including their types, defaults, and descriptions.

```APIDOC
## Edit In Place Properties

### Properties

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `cancelLabel` | `cancel-label` | `string` | `'Cancel'` | Label for the cancel button |
| `editAlwaysVisible` | `edit-always-visible` | `boolean` | `false` | Always show the edit icon (not just on hover) |
| `editLabel` | `edit-label` | `string` | `'Edit'` | Label for the edit button |
| `id` | `id` | `string` | `''` | Specify a custom id for the input |
| `inheritTypography` | `inherit-typography` | `boolean` | `false` | Inherit typography from container |
| `invalid` | `invalid` | `boolean` | `false` | Determines if the input is invalid |
| `invalidText` | `invalid-text` | `string` | `''` | Text displayed when input is invalid |
| `labelText` | `label-text` | `string` | `''` | Text for screen readers |
| `placeholder` | `placeholder` | `string` | `''` | Placeholder text for the input |
| `readOnly` | `read-only` | `boolean` | `false` | Determines if the input is in read-only mode |
| `readOnlyLabel` | `read-only-label` | `string` | `'Edit off'` | Label for the edit off button in read-only mode |
| `readOnlyToggleTipText` | `read-only-toggletip-text` | `string` | `'This field is read-only...'` | Text for the tooltip shown in read-only mode |
| `saveLabel` | `save-label` | `string` | `'Save'` | Label for the save button |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Vertical size of control |
| `toggleTipAlignment` | `toggletip-alignment` | `TooltipAlignment` | `'bottom'` | Tooltip alignment in read-only mode |
| `tooltipAlignment` | `tooltip-alignment` | `TooltipAlignment` | `'top'` | Tooltip alignment for buttons |
| `value` | `value` | `string` | `''` | Current value of the input |

```

--------------------------------

### Using the $prefix variable in selectors

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Demonstrates how the global $prefix variable is used in Sass source files to generate dynamic class names, defaulting to 'cds'.

```scss
// Input
.#{$prefix}--my-component {
  // ...
}

// Output
.cds--my-component {
  // ...
}
```

--------------------------------

### cds-preview-date-picker

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/date-picker/next/__stories__/date-picker-v2.mdx

The preview date picker component that replaces the classic Flatpickr-based date picker. It accepts attributes for date formatting, disabling, min/max dates, form name, read-only state, and value.

```APIDOC
## Component: cds-preview-date-picker

### Description
The preview date picker component that replaces the classic Flatpickr-based date picker. It accepts attributes for date formatting, disabling, min/max dates, form name, read-only state, and value.

### Attributes/Properties
- `date-format` (string) - Date display format (default: `m/d/Y`)
- `disabled` (boolean) - Disable the date picker
- `max-date` (string) - Maximum selectable date
- `min-date` (string) - Minimum selectable date
- `name` (string) - Form field name for form submission
- `readonly` (boolean) - Make the date picker read-only
- `value` (string) - Selected date value

### Events
- `cds-preview-date-picker-changed` - Fired when date selection changes
- `cds-preview-date-picker-error` - Fired when an error occurs
```

--------------------------------

### Set modal size with cds-modal size attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/modal/modal.mdx

Sets the modal to the large responsive size via the `size` attribute. The default size is `md`; other options are `xs`, `sm`, and `lg`.

```html
<cds-modal size="lg">
  <cds-modal-header>
    <cds-modal-close-button></cds-modal-close-button>
    <cds-modal-label>Label (Optional)</cds-modal-label>
    <cds-modal-heading>Modal Title</cds-modal-heading>
  </cds-modal-header>
  <cds-modal-body>
    <cds-modal-body-content>Modal text description</cds-modal-body-content>
  </cds-modal-body>
  <cds-modal-footer>
    <cds-modal-footer-button kind="secondary" data-modal-close
      >Cancel</cds-modal-footer-button
    >
    <cds-modal-footer-button kind="primary">Save</cds-modal-footer-button>
  </cds-modal-footer>
</cds-modal>
```

--------------------------------

### HTML with Multiple Items

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/add-select/add-select.mdx

Use this HTML to render a multi-select add-select with multiple items. The `global-search-placeholder` attribute sets the placeholder for the search input, and the `item-count` attribute controls the number of items shown.

```html
<cds-add-select multi>
  <cds-add-select-body
    items-label="All items"
    global-search-label="Search"
    global-search-placeholder="Search items"
    item-count="5">
    <cds-add-select-column multi title="Available items">
      <cds-add-select-row
        item-id="1"
        title="Item 1"
        subtitle="Description"
        value="item-1"></cds-add-select-row>
      <cds-add-select-row
        item-id="2"
        title="Item 2"
        subtitle="Description"
        value="item-2"></cds-add-select-row>
    </cds-add-select-column>
  </cds-add-select-body>
</cds-add-select>
```

--------------------------------

### Use carousel mixins in Web Components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/carousel/README.md

Import the carousel styles and apply the mixins inside a :host selector for Web Component applications. Use carousel.carousel for all styles, or wrapperStyles and viewStyles individually.

```scss
@use '@carbon/styles/scss/_carbon-utilities.scss' as carousel; // or @use '@carbon/utilities/scss/carousel' as carousel ;

:host {
  @include carousel.carousel;
  or
  @include carousel.wrapperStyles; // for wrapper styles
  @include carousel.viewStyles; // for view styles
}
```

--------------------------------

### Run end-to-end tests with yarn test:e2e

Source: https://github.com/carbon-design-system/carbon/blob/main/e2e/README.md

Runs the end-to-end tests for Carbon Elements. These tests may take a long time and require the project to be built beforehand.

```bash
yarn test:e2e
```

--------------------------------

### Resizer with pivot handle

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/resizer/resizer.mdx

Adds a cds-resizer-handle-pivot inside a cds-resizer-handle for simultaneous two-axis resizing. The pivot handle is nested within the left panel's handle slot.

```html
<cds-resizer-grid axis="x">
  <cds-resizer-panel slot="left">
    Left panel content
    <cds-resizer-handle slot="handle-horizontal">
      <cds-resizer-handle-pivot></cds-resizer-handle-pivot>
    </cds-resizer-handle>
  </cds-resizer-panel>

  <cds-resizer-panel slot="right">Right panel content</cds-resizer-panel>
</cds-resizer-grid>
```

--------------------------------

### cds-header-nav-item minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Renders the cds-header-nav-item component with minimum attributes. The anchor has no href and tabindex is set to 0.

```html
<a
  class="cds--header__menu-item"
  part="link"
  tabindex="0"
>
  <span
    class="cds--text-truncate--end"
    part="title"
  >
    <slot>
    </slot>
  </span>
</a>

```

--------------------------------

### Static children with single step (InterstitialScreenView)

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Pass a single InterstitialScreenView as static child for a single-step interstitial.

```jsx
<InterstitialScreen.Body>
  <InterstitialScreenView>Content</InterstitialScreenView>
</InterstitialScreen.Body>
```

--------------------------------

### HTML Template for Generate API Key Modal

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/examples/generate-an-api-key/generate-an-api-key.mdx

HTML template for the modal that generates an API key. Includes conditional rendering for password input, text input, inline loading, error messages, success messages, and download link. Uses Carbon web components and Lit template syntax.

```html
<cds-modal>
  <cds-modal-header>
    <cds-modal-label>An example of Generate API key</cds-modal-label>
    <cds-modal-heading>Generate an API key</cds-modal-heading>
  </cds-modal-header>
  <cds-modal-body>
    <cds-modal-body-content>
      (Optional description text) To connect securely to [product name], your
      application or tool needs an API key with permission to access resources
      such as [product resource name].
    </cds-modal-body-content>

    ${this.apiKey ? html`
    <cds-password-input
      value="${this.apiKey}"
      label="API key"
      show-password-label="Show key"
      hide-password-label="Hide key"
      tooltip-position="left"
      readonly="true"
      helper-text="This is your unique API key and is non-recoverable. If you lose this API key, you will have to reset it."
    />
    ` : null} ${!this.apiKeyLoaded && this.nameRequired ? html`
    <cds-form-item>
      <cds-text-input
        label="Name your application"
        id="test-id"
        .value="${this.apiKeyName}"
        @input="${this._inputHandler}"
        placeholder="Application name"
        ?disabled="${this.loading}"
        ?required="${this.nameRequired}"
        helper-text="Providing the application name will help you identify your API key later."
      ></cds-text-input> </cds-form-item
    >` : null} ${this.loading ? html`
    <cds-inline-loading
      ?icon-description="Generating"
      >Generating...</cds-inline-loading
    >
    ` : null} ${this.copyError || this.error ? html`
    <div>
      <div>
        ${iconLoader(ErrorFilled16, { slot: 'icon' })}
      </div>
      <p
        class="${`${blockClass}__messaging-text`}"
        role="alert"
        aria-live="assertive"
      >
        ${this.copyError ? html`` : html`Failed to create API key`}
      </p>
    </div>
    ` : null} ${this.apiKeyLoaded ? html`
    <div>
      ${iconLoader(InformationFilled16, { slot: 'icon' })} ${this.hasDownloadLink ? html`
      <api-key-downloader
        apiKey="${this.apiKey}"
        fileName="apikey"
        linkText="Download as JSON"
        fileType="json"
        downloadLinkLabel="Download API Key in Java Script File format"
      />` : html`
      <div
        role="alert"
        aria-live="assertive"
      >
        <p>
          This is your unique API key and is non-recoverable. If you lose this
          API key, you will have to reset it.
        </p>
      </div>
      `}
    </div>
    ` : null} ${this.editSuccess || this.apiKeyLoaded ? html`
    <div>
      ${iconLoader(CheckmarkFilled16, { slot: 'icon' })}
      <p
        role="alert"
        aria-live="assertive"
      >
        API key successfully created
      </p>
    </div>
    ` : null}
  </cds-modal-body>
  <cds-modal-footer>
    <cds-modal-footer-button
      kind="secondary"
      data-modal-close
      @click="${onCloseHandler}"
    >Close</cds-modal-footer-button>
    <cds-modal-footer-button
      ?disabled="${this.isPrimaryButtonDisabled()}"
      @click="${this._submitHandler}"
      >${this.apiKeyLoaded ? html`Copy ${iconLoader(Copy16, { slot: 'icon' })}` : 'Generate API key'}
    </cds-modal-footer-button>
  </cds-modal-footer>
</cds-modal>
```

--------------------------------

### Abstract ModalStateManager with renderLauncher and children

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.mdx

Abstract version of the state manager that accepts `renderLauncher` and `children` props. It manages the `open` state and renders the modal content via a portal, while the launcher content is rendered normally. Useful for reusable modal state management.

```jsx
const ModalStateManager = ({
  renderLauncher: LauncherContent,
  children: ModalContent,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!ModalContent || typeof document === 'undefined'
        ? null
        : ReactDOM.createPortal(
            <ModalContent open={open} setOpen={setOpen} />,
            document.body
          )}
      {LauncherContent && <LauncherContent open={open} setOpen={setOpen} />}
    </>
  );
};
```

--------------------------------

### Static children with multiple steps

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/InterstitialScreen/InterstitialScreen.mdx

Pass multiple InterstitialScreenView elements as static children of InterstitialScreen.Body. Steps are inferred from the number of child elements.

```jsx
<InterstitialScreen.Body>
  <InterstitialScreenView stepTitle="Step 1">
    Content for Step 1
  </InterstitialScreenView>
  <InterstitialScreenView stepTitle="Step 2">
    Content for Step 2
  </InterstitialScreenView>
</InterstitialScreen.Body>
```

--------------------------------

### DatePicker locale

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/DatePicker.mdx

Sets the locale for internationalization. Combine with dateFormat for best results. Passed to Flatpickr.

```APIDOC
## DatePicker `locale`

### Description
Sets the locale for internationalization. Combine with dateFormat for best results. Passed to Flatpickr.

### Parameters
- **locale** (string) - Optional - Locale code (e.g., "no" for Norwegian).

### Example
```jsx
// Load Norwegian text with the proper date format
<DatePicker locale="no" dateFormat="d/m/Y" datePickerType="single">
  <DatePickerInput placeholder="dd/mm/yyyy" />
</DatePicker>
```
```

--------------------------------

### Render cds-table-toolbar-search with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/data-table.md

Rendered markup for cds-table-toolbar-search with various attributes, including extra-large size and tabindex -1.

```html
<div
  class="cds--search cds--search--xl"
  tabindex="-1"
>
  <div class="cds--search-magnifier">
    <slot name="icon">
    </slot>
  </div>
  <label
    class="cds--label"
    for="input"
    part="label-text"
  >
    <slot>
    </slot>
  </label>
  <input
    autocomplete="off"
    class="cds--search-input"
    id="input"
    part="input"
    placeholder="Search"
    role="search"
  >
  <button
    aria-label=""
    class="cds--search-close cds--search-close--hidden"
    part="close-button"
    type="button"
  >
  </button>
</div>

```

--------------------------------

### Import FlexGrid, Row, Column from @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Grid/FlexGrid.mdx

Import the FlexGrid, Row, and Column components from the @carbon/react package to build layouts using Carbon's 2x Grid.

```js
import { FlexGrid, Row, Column } from '@carbon/react';
```

--------------------------------

### Combo Box CSS and HTML Structure

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/combo-box/index.html

Defines the CSS to hide the component until defined and the HTML structure for the combo box with multiple options.

```css
/* Suppress custom element until styles are loaded */ cds-combo-box:not(:defined) { display: none; }
```

```html
<cds-combo-box>
  <cds-combo-box-item value="all">Option 1</cds-combo-box-item>
  <cds-combo-box-item value="cloudFoundry">Option 2</cds-combo-box-item>
  <cds-combo-box-item value="ibmCloud">Option 3</cds-combo-box-item>
  <cds-combo-box-item value="ibmCloudPrivate">Option 4</cds-combo-box-item>
  <cds-combo-box-item value="dedicated">Option 5</cds-combo-box-item>
  <cds-combo-box-item value="public">Option 6</cds-combo-box-item>
  <cds-combo-box-item value="staging">Option 7</cds-combo-box-item>
  <cds-combo-box-item value="other">Option 8</cds-combo-box-item>
</cds-combo-box>
```

--------------------------------

### cds-menu-item with render-icon slot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/menu/menu.mdx

Shows how to add an icon to a menu item by passing it to the 'render-icon' slot. The icon is rendered inside the menu item.

```html
<cds-menu open>
  <cds-menu-item label="Cut" shortcut="⌘X">
    ${Cut16({ slot: 'render-icon' })}
  </cds-menu-item>
  <cds-menu-item label="Copy" shortcut="⌘C"></cds-menu-item>
  <cds-menu-item label="Paste" shortcut="⌘V" disabled></cds-menu-item>
</cds-menu>
```

--------------------------------

### Import path for @carbon/react

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/type/README.md

When using @carbon/react, the import path changes to '@carbon/react/scss/type'.

```scss
@use '@carbon/react/scss/type';
```

--------------------------------

### Layout component with size and density context

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Layout/Layout.mdx

Shows how the Layout component sets size and density for child components. Components with an explicit size are unaffected, while others inherit the layout context or fall back to defaults.

```jsx
<div>
  {/* This text input is always lg */}
  <TextInput size="lg" />

  {/* This text input will render with its default size (md) */}
  <TextInput />

  <Layout size="sm">
    {/* This text input will still be lg */}
    <TextInput size="lg" />

    {/* This text input will be sm */}
    <TextInput />
  </Layout>
</div>
```

--------------------------------

### Rendered HTML with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-input.md

Snapshot of the cds-text-input component's rendered HTML when attributes like disabled, autofocus, light theme, and extra-large size are applied. The label, input, helper text, and validity message slots are shown with their classes and content.

```html
<label
  class="cds--label cds--label--disabled"
  for="input"
>
  <slot name="label-text">
    label-text-foo
  </slot>
</label>
<div class="cds--text-input__field-wrapper">
  <input
    aria-describedby="helper-text"
    autocomplete="on"
    autofocus=""
    class="cds--text-input cds--text-input--light cds--text-input--xl"
    disabled=""
    id="input"
    name="name-foo"
    pattern="pattern-foo"
    placeholder="placeholder-foo"
    readonly=""
    required=""
    type="text"
  >
</div>
<div
  class="cds--form__helper-text cds--form__helper-text--disabled"
  id="helper-text"
>
  <slot name="helper-text">
    helper-text-foo
  </slot>
</div>
<div class="cds--form-requirement">
  <slot name="validity-message">
    validity-message-foo
  </slot>
</div>
```

--------------------------------

### Acceptable and avoidable multiple instances in stories

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0006-storybook-organization.md

Shows acceptable multiple instances sharing controls versus avoidable multiple unrelated instances. Use the acceptable pattern when demonstrating consistency across layers/themes.

```typescript
// ✅ Acceptable: Multiple instances sharing controls
export const Layers = {
  render: (args) => (
    <>
      <Button {...args} />
      <Button {...args} />
    </>
  ),
};
```

```typescript
// ❌ Avoid: Multiple unrelated instances
export const Example = {
  render: () => (
    <>
      <Button>Primary</Button>
      <Button kind="secondary">Secondary</Button>
      <Button kind="tertiary">Tertiary</Button>
    </>
  ),
};
```

--------------------------------

### Basic Grid with Columns

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/grid/grid.mdx

Create a grid with four columns, each spanning 4 columns at the large breakpoint. The default grid has 16 columns.

```js
import '@carbon/web-components/es/components/grid/index';

return (
  <cds-grid>
    <cds-column lg="4">Span 4 of 16</cds-column>
    <cds-column lg="4">Span 4 of 16</cds-column>
    <cds-column lg="4">Span 4 of 16</cds-column>
    <cds-column lg="4">Span 4 of 16</cds-column>
  </cds-grid>
);
```

--------------------------------

### Use v11 design tokens in SCSS

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/release-partners.md

Use this SCSS snippet to apply the updated v11 design tokens to a component. It imports the theme and uses the `$background` and `$text-primary` tokens.

```scss
@import 'carbon-components/scss/globals/scss/theme';

.my-component {
  background: $background;
  color: $text-primary;
}
```

--------------------------------

### cds-header-name minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Renders the cds-header-name component with only the required attributes. The anchor has no href, so it is not a link.

```html
<a
  class="cds--header__name"
  part="link"
>
  <slot>
  </slot>
</a>

```

--------------------------------

### Import form component for cds-form-item

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/select/select.mdx

Import the form component to use cds-form-item wrapper for select in a form.

```javascript
import '@carbon/web-components/es/components/form/index.js';
```

--------------------------------

### Import Tearsheet and Content Components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/tearsheet/tearsheet.mdx

Import the tearsheet component and required Carbon content components (text-input, textarea, button) for use in a JavaScript application.

```javascript
import '@carbon/web-components/es/components/tearsheet/index.js';
// Import Carbon components for content
import '@carbon/web-components/es/components/text-input/index.js';
import '@carbon/web-components/es/components/textarea/index.js';
import '@carbon/web-components/es/components/button/index.js';
```

--------------------------------

### Render icons with ARIA labels

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/icon/icon.mdx

Renders icons with ARIA labels for accessibility, providing descriptive text for each icon.

```html
<cds-icon .icon="${Add16}" aria-label="Add item"></cds-icon>
<cds-icon .icon="${ChevronRight16}" aria-label="Navigate forward"></cds-icon>
<cds-icon .icon="${Search16}" aria-label="Search"></cds-icon>
```

--------------------------------

### Basic cds-combo-button usage

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/combo-button/combo-button.mdx

Basic usage of the cds-combo-button component. The primary action's label is passed via the label attribute, and additional actions are provided as cds-menu-item children inside a cds-menu element.

```html
<cds-combo-button label="Primary action">
  <cds-menu>
    <cds-menu-item label="Second action"></cds-menu-item>
    <cds-menu-item label="Third action"></cds-menu-item>
    <cds-menu-item label="Fourth action"></cds-menu-item>
  </cds-menu>
</cds-combo-button>
```

--------------------------------

### cds-file-uploader-item editing state with various attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/file-uploader.md

Rendered output for the cds-file-uploader-item component in the editing state with various attributes. The form requirement is visible (no hidden attribute) while the supplement remains hidden.

```html
<p class="cds--file-filename">
  <slot>
  </slot>
</p>
<span class="cds--file__state-container">
  <button
    aria-label="Delete this file"
    class="cds--file-close"
    type="button"
  >
  </button>
</span>
<div class="cds--form-requirement">
  <div class="cds--form-requirement__title">
  </div>
  <p
    class="cds--form-requirement__supplement"
    hidden=""
  >
  </p>
</div>
```

--------------------------------

### Listen for cds-menu-opened event

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/menu/menu.mdx

Add an event listener to catch when the menu opens. The event object contains values that can be used in the callback.

```javascript
document.addEventListener('cds-menu-opened', (event) => {
  // use values here
});
```

--------------------------------

### toSVG

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Formats the given icon descriptor into a DOM node.

```APIDOC
## toSVG

### Description
Formats the given icon descriptor into a DOM node.

### Method
Function

### Signature
`toSVG(descriptor: Object) => DOMNode`

### Parameters
- **descriptor** (Object) - Required - The icon descriptor object.

### Example
```js
import { IconName } from '@carbon/icons';
import { toSVG } from '@carbon/icon-helpers';

const iconSVG = toSVG({
  ...IconName,
  attrs: {
    ...IconName.attrs,
    myCustomAttribute: 'myCustomAttributeValue',
  },
});
```
```

--------------------------------

### Breakpoint-specific columns with cds--col-sm-1

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/grid/README.md

Grid layout using breakpoint-specific column classes like cds--col-sm-1 to control column span at the sm breakpoint.

```html
<div class="cds--grid">
  <div class="cds--row">
    <div class="cds--col-sm-1">1/4</div>
    <div class="cds--col-sm-1">1/4</div>
    <div class="cds--col-sm-1">1/4</div>
    <div class="cds--col-sm-1">1/4</div>
  </div>
</div>
```

--------------------------------

### Nesting Layer components

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Layer/Layer.mdx

Shows how to nest Layer components to apply different layer tokens to children. Each child is rendered with the layer tokens at that layer. Nesting can be indefinite, but token sets typically end after 3 layers.

```jsx
<ChildComponent />
<Layer>
  <ChildComponent />
  <Layer>
    <ChildComponent />
  </Layer>
</Layer>
```

--------------------------------

### Configure PageHeader.ContentPageActions with action items

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/PageHeader/docs/overview.mdx

Defines an array of action objects for PageHeader.ContentPageActions, specifying both the non-collapsed button body and the collapsed menu item properties. This structure enables responsive behavior where actions are grouped into a menu on smaller screens.

```jsx
const actionItems = [
  {
    // props used for both collapse menu item and non-collapsed action form
    id: 'action1',
    onClick: () => console.log(`Action 1`),
    // component to render when non-collapsed
    body: (
      <Button
        renderIcon={AiGenerate}
        iconDescription="Icon Description 1"
        hasIconOnly
        size="md"
        kind="ghost"
      />
    ),
    // props to pass to the corresponding collapsed menu item
    menuItem: {
      label: 'action 1',
    },
  },
  ...
];

return (
  <PageHeader.Root>
   ...
    <PageHeader.Content
      title="Title text"
      contextualActions={
        <>
          <Tag className="tag" type="blue" size="lg">
            Tag
          </Tag>
        </>
      }
      pageActions={
        <PageHeader.ContentPageActions
          menuButtonLabel="Actions"
          actions={actionItems}></PageHeader.ContentPageActions>
      }>
      <PageHeader.ContentText subtitle="Subtitle">
        Built for modern teams, our technology platform simplifies complexity
        with powerful APIs, real-time collaboration tools, and seamless
        integration. From deployment to monitoring, we help you ship faster,
        scale efficiently, and stay in control every step of the way.
      </PageHeader.ContentText>
    </PageHeader.Content>
  </PageHeader.Root>
)
```

--------------------------------

### cds-pagination various attributes snapshot

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-pagination.md

Rendered output of cds-pagination with various attributes. The backward button is not disabled, and the items count shows '11–30 of 200 items'.

```html
<div class="cds--pagination__left">
  <slot name="page-sizes-select">
  </slot>
  <div class="cds-ce--pagination__divider">
  </div>
  <span class="cds--pagination__items-count cds--pagination__text">
    11–30 of 200 items
  </span>
</div>
<div class="cds-ce--pagination__divider">
</div>
<div class="cds--pagination__right">
  <slot>
  </slot>
  <div class="cds--pagination__control-buttons">
    <button
      class="cds--pagination__button cds--pagination__button--backward"
      title="Previous page"
    >
    </button>
    <button
      class="cds--pagination__button cds--pagination__button--forward"
      title="Next page"
    >
    </button>
  </div>
</div>
```

--------------------------------

### Import components for Coachmark Overlay Elements

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/examples/Coachmark/CoachmarkOverlayElements/CoachmarkOverlayElements.mdx

Imports the Button, Theme, Link, CoachmarkBeacon, Coachmark, and carousel utilities needed to build the Coachmark overlay pattern.

```jsx
import { Button, Theme, Link as CarbonLink } from '@carbon/react';
import {
  preview__CoachmarkBeacon as CoachmarkBeacon,
  preview__Coachmark as Coachmark,
} from '@carbon/ibm-products';
import { InitCarousel, initCarousel } from '@carbon/utilities';
```

--------------------------------

### layout.use generated CSS for default only

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Shows the local CSS custom property emitted when only a default is provided.

```scss
.my-component {
  @include layout.use('size', $default: 'md');
}
```

```scss
.my-component {
  --cds-layout-size-height-local: clamp(
    var(--cds-layout-size-height-min),
    var(--cds-layout-size-height, var(--cds-layout-size-height-md)),
    var(--cds-layout-size-height-max)
  );
}
```

--------------------------------

### cds-radio-tile minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-tile.md

Rendered HTML for cds-radio-tile with minimum attributes. The input is a radio button with tabindex '-1' and the label has class 'cds--tile cds--tile--selectable'.

```html
<input
  class="cds--tile-input"
  id="input"
  tabindex="-1"
  type="radio"
>
<label
  class="cds--tile cds--tile--selectable"
  for="input"
  tabindex="0"
>
  <div class="cds--tile__checkmark">
  </div>
  <div class="cds--tile-content">
    <slot>
    </slot>
  </div>
</label>
```

--------------------------------

### layout.redefine-tokens mixin with overrides

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md

Locally redefines layout tokens for components using non-standard values. Must be emitted at the outermost selector. Note: because clamp() enforces min/max, you may need to override tokens you don't intend to use; e.g., if the new sm value is smaller than the default xs, include xs to avoid unexpected sizing.

```scss
@use '@carbon/styles/scss/utilities/layout';

.my-component {
  @include layout.redefine-tokens(
    // all applicable overrides, must follow ( group: ( property: ( step: value ) ) )
    $overrides:
      (
        size: (
          height: (
            sm: 1.125rem,
            md: 1.5rem,
          ),
        )
      )
  );

  @include layout.use('size', $default: 'md', $min: 'sm', $max: 'md');

  height: layout.size('height');
}
```

--------------------------------

### OverflowMenu composition migration from OverflowMenuItem to MenuItem

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/migration/v12.md

Shows the v11 to v12 diff for OverflowMenu children. Item text moves from itemText to label, delete items use kind="danger", and dividers become separate MenuItemDivider components. Trigger-tooltip props also rename (autoAlign to tooltipAutoAlign, defaultOpen to tooltipDefaultOpen, enterDelayMs to tooltipEnterDelayMs, leaveDelayMs to tooltipLeaveDelayMs).

```diff
- <OverflowMenu aria-label="Actions">
-   <OverflowMenuItem itemText="Edit" />
-   <OverflowMenuItem hasDivider isDelete itemText="Delete" />
+ <OverflowMenu label="Actions">
+   <MenuItem label="Edit" />
+   <MenuItemDivider />
+   <MenuItem kind="danger" label="Delete" />
  </OverflowMenu>
```

--------------------------------

### AI Label inline variant with ai-text-label and size xs

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/ai-label/ai-label.mdx

Shows the inline variant with the standard icon and ai-text-label, which can trigger the AI explainability callout.

```html
<cds-ai-label kind="inline" ai-text-label="Text goes here" size="xs">
  <div slot="body-text">Explanation of AI-generated content</div>
</cds-ai-label>
```

--------------------------------

### Run slug-to-decorator codemod

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/upgrade/README.md

Executes the `slug-prop-to-decorator-prop` codemod via npx. This codemod changes all occurrences of the `slug` prop to `decorator`.

```bash
npx @carbon/upgrade migrate slug-prop-to-decorator-prop --write
```

--------------------------------

### onChange signature change

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/DatePicker/next/MIGRATION.md

The onChange callback now receives only an array of Date objects, instead of (selectedDates, dateStr, instance). Format the dates yourself, e.g., with Intl.DateTimeFormat.

```diff
- const handleChange = (selectedDates, dateStr, instance) => setValue(dateStr);
+ const handleChange = (dates) => {
+   const [start, end] = dates; // format yourself, e.g. Intl.DateTimeFormat
+ };
```

--------------------------------

### Import and use IconIndicator with kind and label

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/IconIndicator/IconIndicator.mdx

Shows how to import the IconIndicator component and render it with a 'failed' kind and a label. The component communicates severity level information to users.

```jsx
import { preview__IconIndicator as IconIndicator } from '@carbon/react';

function ExampleComponent() {
  return (
    <IconIndicator kind="failed" label="Failed">
  );
}
```

--------------------------------

### Using IdPrefix in a React component

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/IdPrefix/IdPrefix.mdx

Wrap your application with IdPrefix and set the prefix prop to customize the id prefix. This is typically done at the project root.

```jsx
import { IdPrefix } from '@carbon/react';

export default function MyApp() {
  return (
    <IdPrefix prefix="custom">
      <Page />
    </IdPrefix>
  );
}
```

--------------------------------

### Changing prop type to be more specific (major)

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/versioning.md

Shows a diff changing `propB`'s PropTypes from `PropTypes.node` to `PropTypes.string`. This corresponds to a major semver bump.

```diff
function ExampleComponent({ propA, propB }) {
  return (
    <>
      <span>{propA}</span>
      <span>{propB}</span>
    </>
  );
}

ExampleComponent.propTypes = {
  propA: PropTypes.string,
-  propB: PropTypes.node,
+  propB: PropTypes.string,
};
```

--------------------------------

### Search items with options

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/utilities/src/addSelect/README.md

Search items based on a query with optional case sensitivity, field selection, and result limits. Defaults: caseSensitive false, searchFields ['title', 'value'], maxResults unlimited.

```typescript
// Basic search
const results = dataManager.search('search term');

// Case-sensitive search
const results = dataManager.search('Search Term', { caseSensitive: true });

// Search in specific fields
const results = dataManager.search('term', {
  searchFields: ['title', 'value', 'subtitle'],
});

// Limit results
const results = dataManager.search('term', { maxResults: 10 });
```

--------------------------------

### Import getAttributes from @carbon/icon-helpers

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/building-an-icon-library.md

Import statement for using the getAttributes helper from @carbon/icon-helpers, which sets accessibility attributes like aria-label and handles IE11 quirks like focusable.

```javascript
import { getAttributes } from '@carbon/icon-helpers';
```

--------------------------------

### Render disabled state for <a>

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-btn.md

Renders a paragraph element for the disabled state of an anchor, with the disabled class and secondary and small size classes.

```html
<p
  class="cds--btn cds--btn--disabled cds--btn--secondary cds--btn--sm"
  id="button"
  part="button"
>
  <slot>
  </slot>
  <slot name="icon">
  </slot>
</p>
```

--------------------------------

### cds-copy-button minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/cds-copy-button.md

Renders the cds-copy button with default feedback text 'Copied!' and a 2000ms timeout. The button-class-name is set to 'cds--copy-btn' and includes a tooltip content slot.

```html
<cds-copy
  button-class-name="cds--copy-btn"
  feedback="Copied!"
  feedback-timeout="2000"
>
  <slot slot="tooltip-content">
  </slot>
</cds-copy>
```

--------------------------------

### Button as

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Button/Button.mdx

Specifies a different element to be rendered as a Button. May require adding a role for accessibility if an element other than a button is rendered.

```APIDOC
## Button `as`

### Description
Specifies a different element to be rendered as a Button. May require adding a role for accessibility if an element other than a button is rendered.

### Props
- **as** (string) - Optional - The element type to render as.

### Example
```jsx
<Button as="div" role="button">
  I'm a div tag
</Button>
```
```

--------------------------------

### HTML and CSS for cds-select

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/select/cdn.html

This snippet shows the usage of the cds-select custom element with a CSS rule to hide it until defined. It includes five options.

```css
cds-select:not(:defined) {
  display: none;
}
```

```html
<cds-select>
  <cds-select-item value="option1">Option 1</cds-select-item>
  <cds-select-item value="option2">Option 2</cds-select-item>
  <cds-select-item value="option3">Option 3</cds-select-item>
  <cds-select-item value="option4">Option 4</cds-select-item>
  <cds-select-item value="option5">Option 5</cds-select-item>
</cds-select>
```

--------------------------------

### Programmatically sort a column by clicking its header button

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/data-table/stories/data-table.mdx

Programmatically trigger sorting on the first column by querying the `cds-table-header-cell` element and clicking its sort button. This changes the sort status of the table.

```js
// sorting the first column
document
  .querySelectorAll('cds-table-header-cell')[0]
  .shadowRoot.querySelector('button')
  .click();
```

--------------------------------

### Organize props with control categories for compound components

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/decisions/0006-storybook-organization.md

Use this to organize props for compound components with multiple sub-components by assigning a category in the argTypes table.

```typescript
argTypes: {
  ...sharedArgTypes,
  childProp: {
    control: 'text',
    table: {
      category: 'sub-component-name',
    },
  },
};
```

--------------------------------

### Use ModalPresence to shift presence boundary

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/Modal/Modal.featureflag.mdx

Wrap your component with ModalPresence to auto opt in to enable-presence and shift the presence boundary to a higher level.

```jsx
<ModalPresence open={open}>
  <ComposedModal ... />
</ModalPresence>
```

--------------------------------

### Make icon focusable with aria-label and tabindex

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/icon-helpers/README.md

Provide aria-label or aria-labelledby along with tabindex to make the icon focusable.

```js
const { getAttributes } = require('@carbon/icon-helpers');
const attributes = getAttributes({
  'aria-label': 'My icon label',
  tabindex: '0',
});
```

--------------------------------

### Enable enable-presence with FeatureFlags

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/ComposedModal/ComposedModal.featureflag.mdx

Wrap ComposedModal with the FeatureFlags component and set the enablePresence prop to enable the presence flag, which mounts/unmounts the modal on open/close.

```jsx
<FeatureFlags enablePresence>
  <ComposedModal ... />
</FeatureFlags>
```

--------------------------------

### Programmatic row expansion

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/data-table/stories/data-table.mdx

Programmatically triggers expansion of the first row by clicking its expand button. Requires the row to have an adjacent cds-table-expanded-row sibling.

```js
document
  .querySelectorAll('cds-table-row')[0]
  .shadowRoot.querySelector('.cds--table-expand__button')
  .click();
```

--------------------------------

### AILabel inline variant with textLabel and size xs

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/react/src/components/AILabel/AILabel.mdx

Shows the inline variant with the standard icon and textLabel, triggering the AI explainability callout.

```jsx
<AILabel kind="inline" textLabel="Text goes here" size="xs">
  <AILabelContent>Explanation of AI-generated content</AILabelContent>
</AILabel>
```

--------------------------------

### Enable feature flags via mixin

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/sass.md

Use the enable() mixin from the feature-flags module to toggle features programmatically.

```scss
@use '@carbon/styles/scss/feature-flags';
@use '@carbon/styles';

@include feature-flags.enable('enable-preview-tile-contrast');
```

--------------------------------

### Suppress cds-link until defined

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/examples/components/link/cdn.html

Hides the custom element until its styles are loaded to prevent flash of unstyled content.

```css
cds-link:not(:defined) {
  display: none;
}
```

--------------------------------

### Extend g100 theme with custom tokens

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/styles/README.md

Extends the built-in g100 theme by providing a fallback theme and adding custom tokens to the theme map.

```scss
// Extend the g100 theme with your own tokens
@use '@carbon/styles/scss/themes';
@use '@carbon/styles/scss/theme' with (
  $fallback: themes.$g100,
  $theme: (
    custom-token-01: #000000,
  )
);
```

--------------------------------

### Export a theme token

Source: https://github.com/carbon-design-system/carbon/blob/main/docs/guides/colors.md

Defines a theme token export in a theme file. The token name is on the left and the value is a color reference (e.g., blue60) or a literal value.

```js
export const interactive01 = blue60;
```

--------------------------------

### cds-side-nav-link minimum attributes

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/tests/snapshots/ui-shell.md

Renders the cds-side-nav-link component with minimum attributes. The title icon container is hidden and the href is empty.

```html
<a
  class="cds--side-nav__link"
  href=""
  part="link"
>
  <div
    class="cds--side-nav__icon"
    hidden=""
    id="title-icon-container"
    part="title-icon-container"
  >
    <slot name="title-icon">
    </slot>
  </div>
  <span
    class="cds--side-nav__link-text"
    part="title"
  >
    <slot>
    </slot>
  </span>
</a>

```

--------------------------------

### Button size attribute

Source: https://github.com/carbon-design-system/carbon/blob/main/packages/web-components/src/components/button/button.mdx

Shows the size attribute with valid values xs, sm, md, lg, xl, and 2xl. If no size is specified, it renders as lg.

```html
<cds-button>Button</cds-button>
<cds-button size="sm">Button</cds-button>
<cds-button size="md">Button</cds-button>
<cds-button size="xl">Button</cds-button>
<cds-button size="2xl">Button</cds-button>
```