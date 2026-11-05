import {
  Archive01Icon,
  CpuIcon,
  DashedLineCircleIcon,
  DatabaseIcon,
  DollarCircleIcon,
  File01Icon,
  HierarchySquare02Icon,
  Hold01Icon,
  McpServerIcon,
  QrCodeIcon,
  SecurityWarningIcon,
  ServerStack01Icon,
  SourceCodeIcon,
  StopCircleIcon,
  Table01Icon,
  TimelineIcon,
  Wrench01Icon,
  TextAlignLeftIcon,
} from "@hugeicons/core-free-icons";
import { Activity01 as HiActivity01 } from "./animated/activity-01";
import { ArrowDown02 as HiArrowDown02 } from "./animated/arrow-down-02";
import { ArrowLeft02 as HiArrowLeft02 } from "./animated/arrow-left-02";
import { ArrowRight01 as HiArrowRight01 } from "./animated/arrow-right-01";
import { ArrowRight02 as HiArrowRight02 } from "./animated/arrow-right-02";
import { ArrowUp02 as HiArrowUp02 } from "./animated/arrow-up-02";
import { ArrowUpDown as HiArrowUpDown } from "./animated/arrow-up-down";
import { Bot as HiBot } from "./animated/bot";
import { Calendar as HiCalendar } from "./animated/calendar";
import { Camera as HiCamera } from "./animated/camera";
import { Cancel01 as HiCancel01 } from "./animated/cancel-01";
import { ChartColumn as HiChartColumn } from "./animated/chart-column";
import { Check as HiCheck } from "./animated/check";
import { CheckmarkCircle02 as HiCheckmarkCircle02 } from "./animated/checkmark-circle-02";
import { CircleCheckBig as HiCircleCheckBig } from "./animated/circle-check-big";
import { CircleX as HiCircleX } from "./animated/circle-x";
import { Clock01 as HiClock01 } from "./animated/clock-01";
import { Delete02 as HiDelete02 } from "./animated/delete-02";
import { Download04 as HiDownload04 } from "./animated/download-04";
import { Flash as HiFlash } from "./animated/flash";
import { Globe02 as HiGlobe02 } from "./animated/globe-02";
import { Home03 as HiHome03 } from "./animated/home-03";
import { Hourglass as HiHourglass } from "./animated/hourglass";
import { Key01 as HiKey01 } from "./animated/key-01";
import { Layers01 as HiLayers01 } from "./animated/layers-01";
import { LayoutDashboard as HiLayoutDashboard } from "./animated/layout-dashboard";
import { List as HiList } from "./animated/list";
import { LockKeyhole as HiLockKeyhole } from "./animated/lock-keyhole";
import { Logout01 as HiLogout01 } from "./animated/logout-01";
import { Menu01 as HiMenu01 } from "./animated/menu-01";
import { Message01 as HiMessage01 } from "./animated/message-01";
import { MinusSign as HiMinusSign } from "./animated/minus-sign";
import { Moon02 as HiMoon02 } from "./animated/moon-02";
import { MoreHorizontal as HiMoreHorizontal } from "./animated/more-horizontal";
import { Notification01 as HiNotification01 } from "./animated/notification-01";
import { OctagonAlert as HiOctagonAlert } from "./animated/octagon-alert";
import { PanelLeft as HiPanelLeft } from "./animated/panel-left";
import { Pause as HiPause } from "./animated/pause";
import { PencilEdit02 as HiPencilEdit02 } from "./animated/pencil-edit-02";
import { Pin as HiPin } from "./animated/pin";
import { Play as HiPlay } from "./animated/play";
import { PlugZap as HiPlugZap } from "./animated/plug-zap";
import { PlusSign as HiPlusSign } from "./animated/plus-sign";
import { Printer as HiPrinter } from "./animated/printer";
import { Rocket01 as HiRocket01 } from "./animated/rocket-01";
import { RotateCcw as HiRotateCcw } from "./animated/rotate-ccw";
import { Route as HiRoute } from "./animated/route";
import { Search01 as HiSearch01 } from "./animated/search-01";
import { Sent as HiSent } from "./animated/sent";
import { Settings02 as HiSettings02 } from "./animated/settings-02";
import { ShieldCheck as HiShieldCheck } from "./animated/shield-check";
import { ShoppingCart as HiShoppingCart } from "./animated/shopping-cart";
import { Sparkle as HiSparkle } from "./animated/sparkle";
import { Sparkles as HiSparkles } from "./animated/sparkles";
import { SquareArrowOutUpRight as HiSquareArrowOutUpRight } from "./animated/square-arrow-out-up-right";
import { Sun03 as HiSun03 } from "./animated/sun-03";
import { User as HiUser } from "./animated/user";
import { Users as HiUsers } from "./animated/users";
import { View as HiView } from "./animated/view";
import { Link01 as HiLink01 } from "./animated/link-01";
import { animated, still } from "./icon";

export type { IconProps } from "./icon";

/*
 * The console's icons, named as the code uses them. Each is an animated Hugeicon from Animate UI that plays
 * when the button, link or tab around it is hovered or focused; where Animate UI has no match, a static
 * Hugeicon of the same family stands in.
 */

export const Archive = still(Archive01Icon, "Archive");
export const ArrowDown = animated(HiArrowDown02, "ArrowDown");
export const ArrowDownToLine = animated(HiDownload04, "ArrowDownToLine");
export const ArrowLeft = animated(HiArrowLeft02, "ArrowLeft");
export const ArrowRight = animated(HiArrowRight02, "ArrowRight");
export const ArrowRightFromSquare = animated(HiLogout01, "ArrowRightFromSquare");
export const ArrowRotateLeft = animated(HiRotateCcw, "ArrowRotateLeft");
export const ArrowUp = animated(HiArrowUp02, "ArrowUp");
export const ArrowUpRightFromSquare = animated(HiSquareArrowOutUpRight, "ArrowUpRightFromSquare");
export const Bars = animated(HiMenu01, "Bars");
export const Bell = animated(HiNotification01, "Bell");
export const BranchesRight = animated(HiRoute, "BranchesRight");
export const Calendar = animated(HiCalendar, "Calendar");
export const Camera = animated(HiCamera, "Camera");
export const Check = animated(HiCheck, "Check");
export const ChevronRight = animated(HiArrowRight01, "ChevronRight");
export const ChevronsExpandVertical = animated(HiArrowUpDown, "ChevronsExpandVertical");
export const CircleCheck = animated(HiCheckmarkCircle02, "CircleCheck");
export const CircleCheckFill = animated(HiCircleCheckBig, "CircleCheckFill");
export const CircleDashed = still(DashedLineCircleIcon, "CircleDashed");
export const CircleDollar = still(DollarCircleIcon, "CircleDollar");
export const CircleExclamation = animated(HiOctagonAlert, "CircleExclamation");
export const CircleXmark = animated(HiCircleX, "CircleXmark");
export const Clock = animated(HiClock01, "Clock");
export const Code = still(SourceCodeIcon, "Code");
export const Comment = animated(HiMessage01, "Comment");
export const Cpu = still(CpuIcon, "Cpu");
export const Database = still(DatabaseIcon, "Database");
export const Ellipsis = animated(HiMoreHorizontal, "Ellipsis");
export const Eye = animated(HiView, "Eye");
export const FaceRobot = animated(HiBot, "FaceRobot");
export const FileText = still(File01Icon, "FileText");
export const Gear = animated(HiSettings02, "Gear");
export const Globe = animated(HiGlobe02, "Globe");
export const Hand = still(Hold01Icon, "Hand");
export const Hourglass = animated(HiHourglass, "Hourglass");
export const House = animated(HiHome03, "House");
export const Key = animated(HiKey01, "Key");
export const Layers = animated(HiLayers01, "Layers");
export const LayoutCells = still(Table01Icon, "LayoutCells");
export const LayoutHeaderCellsLarge = animated(HiLayoutDashboard, "LayoutHeaderCellsLarge");
export const LayoutSideContentLeft = animated(HiPanelLeft, "LayoutSideContentLeft");
export const ListTimeline = still(TimelineIcon, "ListTimeline");
export const Link = animated(HiLink01, "Link");
export const Lock = animated(HiLockKeyhole, "Lock");
export const LogoMcp = still(McpServerIcon, "LogoMcp");
export const Magnifier = animated(HiSearch01, "Magnifier");
export const Minus = animated(HiMinusSign, "Minus");
export const Moon = animated(HiMoon02, "Moon");
export const NodesRight = still(HierarchySquare02Icon, "NodesRight");
export const PaperPlane = animated(HiSent, "PaperPlane");
export const Pause = animated(HiPause, "Pause");
export const Pencil = animated(HiPencilEdit02, "Pencil");
export const PencilToSquare = animated(HiPencilEdit02, "PencilToSquare");
export const Person = animated(HiUser, "Person");
export const Persons = animated(HiUsers, "Persons");
export const Pin = animated(HiPin, "Pin");
export const Play = animated(HiPlay, "Play");
export const PlugConnection = animated(HiPlugZap, "PlugConnection");
export const Plus = animated(HiPlusSign, "Plus");
export const Printer = animated(HiPrinter, "Printer");
export const Pulse = animated(HiActivity01, "Pulse");
export const QrCode = still(QrCodeIcon, "QrCode");
export const Rocket = animated(HiRocket01, "Rocket");
export const Server = still(ServerStack01Icon, "Server");
export const ShieldCheck = animated(HiShieldCheck, "ShieldCheck");
export const ShieldExclamation = still(SecurityWarningIcon, "ShieldExclamation");
export const ShoppingCart = animated(HiShoppingCart, "ShoppingCart");
export const Sparkles = animated(HiSparkle, "Sparkles");
export const SparklesFill = animated(HiSparkles, "SparklesFill");
export const SquareChartColumn = animated(HiChartColumn, "SquareChartColumn");
export const SquareListUl = animated(HiList, "SquareListUl");
export const Stop = still(StopCircleIcon, "Stop");
export const Sun = animated(HiSun03, "Sun");
export const TextAlignLeft = still(TextAlignLeftIcon, "TextAlignLeft");
export const Thunderbolt = animated(HiFlash, "Thunderbolt");
export const TrashBin = animated(HiDelete02, "TrashBin");
export const Wrench = still(Wrench01Icon, "Wrench");
export const Xmark = animated(HiCancel01, "Xmark");
/** The pinned state: the same pin, filled. */
export const PinFill = animated(HiPin, "PinFill", { fill: "currentColor" });
