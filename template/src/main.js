// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Import Firebase initialization
import './firebase'

// Import the main CSS file
import './assets/main.css'

// FontAwesome imports
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Import specific icons from free solid icons
import { 
  faHome,
  faMusic,
  faUpload,
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faCog,
  faChartBar,
  faCube,
  faRocket,
  faBullseye,
  faPalette,
  faCheckCircle,
  faChartLine,
  faCopy,
  faTruck,
  faMoon,
  faSun,
  faBars,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faSave,
  faCircle,
  faExclamationTriangle,
  faInfoCircle,
  faEye,
  faSearch,
  faSync,
  faSpinner,
  faPlug,
  faCalendar,
  faArrowRight,
  faStar,
  faCode,
  faBug,
  faLightbulb,
  faBook,
  faHardHat,
  faLaptopCode,
  faPaperPlane,
  faFileCode,
  faServer,
  faCheckSquare,
  faDownload,
  faClock,
  faGlobe,
  faFile,
  faImage,
  faCircleXmark,
  faFileAlt,
  faBan,
  faRedo,
  faList,
  faTimesCircle,
  faPlay,
  faHeartbeat,
  faTachometerAlt,
  faShieldAlt,
  faEnvelope,
  faFileImport,
  faImages,
  faTags,
  faFingerprint,
  faLock,
  faKey,
  faLanguage,
  faUsers,
  faUser,
  faFileCsv,
  faProjectDiagram
} from '@fortawesome/free-solid-svg-icons'

// Import brand icons
import { 
  faGoogle,
  faSpotify,
  faApple,
  faGithub,
  faTwitter,
  faFacebook,
  faYoutube,
  faNpm
} from '@fortawesome/free-brands-svg-icons'

// Add solid icons to the library
library.add(
  faHome,
  faMusic,
  faUpload,
  faPlus,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faCog,
  faChartBar,
  faCube,
  faRocket,
  faBullseye,
  faPalette,
  faCheckCircle,
  faChartLine,
  faCopy,
  faTruck,
  faMoon,
  faSun,
  faBars,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faSave,
  faCircle,
  faExclamationTriangle,
  faInfoCircle,
  faEye,
  faSearch,
  faSync,
  faSpinner,
  faPlug,
  faCalendar,
  faArrowRight,
  faStar,
  faCode,
  faBug,
  faLightbulb,
  faBook,
  faHardHat,
  faLaptopCode,
  faPaperPlane,
  faFileCode,
  faServer,
  faCheckSquare,
  faDownload,
  faClock,
  faGlobe,
  faFile,
  faImage,
  faCircleXmark,
  faFileAlt,
  faBan,
  faRedo,
  faList,
  faTimesCircle,
  faPlay,
  faHeartbeat,
  faTachometerAlt,
  faShieldAlt,
  faEnvelope,
  faFileImport,
  faImages,
  faTags,
  faFingerprint,
  faLock,
  faKey,
  faLanguage,
  faUsers,
  faUser,
  faFileCsv,
  faProjectDiagram
)

// Add brand icons to the library
library.add(
  faGoogle,
  faSpotify,
  faApple,
  faGithub,
  faTwitter,
  faFacebook,
  faYoutube,
  faNpm
)

const app = createApp(App)

// Register FontAwesome component globally
app.component('font-awesome-icon', FontAwesomeIcon)

app.use(router)

app.mount('#app')