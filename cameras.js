// Dynamic go2rtc host resolution: automatically adapts to the current hostname/IP of the browser
window.GO2RTC = (function() {
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    var proto = window.location.protocol === "https:" ? "https:" : "http:";
    return proto + "//" + window.location.hostname + ":1984";
  }
  return "http://127.0.0.1:1984";
})();

window.CAMERAS = [
  {
    "name": "dvr20_ch1",
    "label": "SQ14",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch1_sub",
    "solo": "dvr20_ch1"
  },
  {
    "name": "dvr20_ch2",
    "label": "2nd gate outside",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch2_sub",
    "solo": "dvr20_ch2"
  },
  {
    "name": "dvr20_ch3",
    "label": "SQ13",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch3_sub",
    "solo": "dvr20_ch3"
  },
  {
    "name": "dvr20_ch4",
    "label": "main gate inside",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch4_sub",
    "solo": "dvr20_ch4"
  },
  {
    "name": "dvr20_ch5",
    "label": "SQ12",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch5_sub",
    "solo": "dvr20_ch5"
  },
  {
    "name": "dvr20_ch6",
    "label": "guardroom viwe",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch6_sub",
    "solo": "dvr20_ch6"
  },
  {
    "name": "dvr20_ch7",
    "label": "canteen in",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch7_sub",
    "solo": "dvr20_ch7"
  },
  {
    "name": "dvr20_ch8",
    "label": "woshroom aria",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch8_sub",
    "solo": "dvr20_ch8"
  },
  {
    "name": "dvr20_ch9",
    "label": "parking",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch9_sub",
    "solo": "dvr20_ch9"
  },
  {
    "name": "dvr20_ch10",
    "label": "scale",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch10_sub",
    "solo": "dvr20_ch10"
  },
  {
    "name": "dvr20_ch11",
    "label": "DVR .20 (Dahua) · Ch11",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch11_sub",
    "solo": "dvr20_ch11"
  },
  {
    "name": "dvr20_ch12",
    "label": "kitchen",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch12_sub",
    "solo": "dvr20_ch12"
  },
  {
    "name": "dvr20_ch13",
    "label": "canteen inside",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch13_sub",
    "solo": "dvr20_ch13"
  },
  {
    "name": "dvr20_ch14",
    "label": "genarator",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch14_sub",
    "solo": "dvr20_ch14"
  },
  {
    "name": "dvr20_ch15",
    "label": "DVR .20 (Dahua) · Ch15",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch15_sub",
    "solo": "dvr20_ch15"
  },
  {
    "name": "dvr20_ch16",
    "label": "DVR .20 (Dahua) · Ch16",
    "group": "DVR .20 (Dahua)",
    "tile": "dvr20_ch16_sub",
    "solo": "dvr20_ch16"
  },
  {
    "name": "dvr40_ch1",
    "label": "DVR .40 (Dahua) · Ch1",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch1_sub",
    "solo": "dvr40_ch1"
  },
  {
    "name": "dvr40_ch2",
    "label": "DVR .40 (Dahua) · Ch2",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch2_sub",
    "solo": "dvr40_ch2"
  },
  {
    "name": "dvr40_ch3",
    "label": "DVR .40 (Dahua) · Ch3",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch3_sub",
    "solo": "dvr40_ch3"
  },
  {
    "name": "dvr40_ch4",
    "label": "DVR .40 (Dahua) · Ch4",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch4_sub",
    "solo": "dvr40_ch4"
  },
  {
    "name": "dvr40_ch5",
    "label": "DVR .40 (Dahua) · Ch5",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch5_sub",
    "solo": "dvr40_ch5"
  },
  {
    "name": "dvr40_ch6",
    "label": "DVR .40 (Dahua) · Ch6",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch6_sub",
    "solo": "dvr40_ch6"
  },
  {
    "name": "dvr40_ch7",
    "label": "SQ06",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch7_sub",
    "solo": "dvr40_ch7"
  },
  {
    "name": "dvr40_ch8",
    "label": "SQ03",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch8_sub",
    "solo": "dvr40_ch8"
  },
  {
    "name": "dvr40_ch9",
    "label": "DVR .40 (Dahua) · Ch9",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch9_sub",
    "solo": "dvr40_ch9"
  },
  {
    "name": "dvr40_ch10",
    "label": "SQ05",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch10_sub",
    "solo": "dvr40_ch10"
  },
  {
    "name": "dvr40_ch11",
    "label": "SQ04",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch11_sub",
    "solo": "dvr40_ch11"
  },
  {
    "name": "dvr40_ch12",
    "label": "DVR .40 (Dahua) · Ch12",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch12_sub",
    "solo": "dvr40_ch12"
  },
  {
    "name": "dvr40_ch13",
    "label": "SQ01",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch13_sub",
    "solo": "dvr40_ch13"
  },
  {
    "name": "dvr40_ch14",
    "label": "DVR .40 (Dahua) · Ch14",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch14_sub",
    "solo": "dvr40_ch14"
  },
  {
    "name": "dvr40_ch15",
    "label": "DVR .40 (Dahua) · Ch15",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch15_sub",
    "solo": "dvr40_ch15"
  },
  {
    "name": "dvr40_ch16",
    "label": "SQ09",
    "group": "DVR .40 (Dahua)",
    "tile": "dvr40_ch16_sub",
    "solo": "dvr40_ch16"
  },
  {
    "name": "dvr90_ch1",
    "label": "DVR .90 (Dahua) · Ch1",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch1_sub",
    "solo": "dvr90_ch1"
  },
  {
    "name": "dvr90_ch2",
    "label": "DVR .90 (Dahua) · Ch2",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch2_sub",
    "solo": "dvr90_ch2"
  },
  {
    "name": "dvr90_ch3",
    "label": "DVR .90 (Dahua) · Ch3",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch3_sub",
    "solo": "dvr90_ch3"
  },
  {
    "name": "dvr90_ch4",
    "label": "DVR .90 (Dahua) · Ch4",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch4_sub",
    "solo": "dvr90_ch4"
  },
  {
    "name": "dvr90_ch5",
    "label": "DVR .90 (Dahua) · Ch5",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch5_sub",
    "solo": "dvr90_ch5"
  },
  {
    "name": "dvr90_ch6",
    "label": "DVR .90 (Dahua) · Ch6",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch6_sub",
    "solo": "dvr90_ch6"
  },
  {
    "name": "dvr90_ch7",
    "label": "DVR .90 (Dahua) · Ch7",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch7_sub",
    "solo": "dvr90_ch7"
  },
  {
    "name": "dvr90_ch8",
    "label": "DVR .90 (Dahua) · Ch8",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch8_sub",
    "solo": "dvr90_ch8"
  },
  {
    "name": "dvr90_ch9",
    "label": "DVR .90 (Dahua) · Ch9",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch9_sub",
    "solo": "dvr90_ch9"
  },
  {
    "name": "dvr90_ch10",
    "label": "DVR .90 (Dahua) · Ch10",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch10_sub",
    "solo": "dvr90_ch10"
  },
  {
    "name": "dvr90_ch11",
    "label": "DVR .90 (Dahua) · Ch11",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch11_sub",
    "solo": "dvr90_ch11"
  },
  {
    "name": "dvr90_ch12",
    "label": "DVR .90 (Dahua) · Ch12",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch12_sub",
    "solo": "dvr90_ch12"
  },
  {
    "name": "dvr90_ch13",
    "label": "DVR .90 (Dahua) · Ch13",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch13_sub",
    "solo": "dvr90_ch13"
  },
  {
    "name": "dvr90_ch14",
    "label": "DVR .90 (Dahua) · Ch14",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch14_sub",
    "solo": "dvr90_ch14"
  },
  {
    "name": "dvr90_ch15",
    "label": "DVR .90 (Dahua) · Ch15",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch15_sub",
    "solo": "dvr90_ch15"
  },
  {
    "name": "dvr90_ch16",
    "label": "DVR .90 (Dahua) · Ch16",
    "group": "DVR .90 (Dahua)",
    "tile": "dvr90_ch16_sub",
    "solo": "dvr90_ch16"
  },
  {
    "name": "dvr95_ch1",
    "label": "DVR .95 (Dahua) · Ch1",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch1_sub",
    "solo": "dvr95_ch1"
  },
  {
    "name": "dvr95_ch2",
    "label": "DVR .95 (Dahua) · Ch2",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch2_sub",
    "solo": "dvr95_ch2"
  },
  {
    "name": "dvr95_ch3",
    "label": "DVR .95 (Dahua) · Ch3",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch3_sub",
    "solo": "dvr95_ch3"
  },
  {
    "name": "dvr95_ch4",
    "label": "DVR .95 (Dahua) · Ch4",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch4_sub",
    "solo": "dvr95_ch4"
  },
  {
    "name": "dvr95_ch5",
    "label": "DVR .95 (Dahua) · Ch5",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch5_sub",
    "solo": "dvr95_ch5"
  },
  {
    "name": "dvr95_ch6",
    "label": "DVR .95 (Dahua) · Ch6",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch6_sub",
    "solo": "dvr95_ch6"
  },
  {
    "name": "dvr95_ch7",
    "label": "DVR .95 (Dahua) · Ch7",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch7_sub",
    "solo": "dvr95_ch7"
  },
  {
    "name": "dvr95_ch8",
    "label": "DVR .95 (Dahua) · Ch8",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch8_sub",
    "solo": "dvr95_ch8"
  },
  {
    "name": "dvr95_ch9",
    "label": "DVR .95 (Dahua) · Ch9",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch9_sub",
    "solo": "dvr95_ch9"
  },
  {
    "name": "dvr95_ch10",
    "label": "DVR .95 (Dahua) · Ch10",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch10_sub",
    "solo": "dvr95_ch10"
  },
  {
    "name": "dvr95_ch11",
    "label": "DVR .95 (Dahua) · Ch11",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch11_sub",
    "solo": "dvr95_ch11"
  },
  {
    "name": "dvr95_ch12",
    "label": "DVR .95 (Dahua) · Ch12",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch12_sub",
    "solo": "dvr95_ch12"
  },
  {
    "name": "dvr95_ch13",
    "label": "DVR .95 (Dahua) · Ch13",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch13_sub",
    "solo": "dvr95_ch13"
  },
  {
    "name": "dvr95_ch14",
    "label": "DVR .95 (Dahua) · Ch14",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch14_sub",
    "solo": "dvr95_ch14"
  },
  {
    "name": "dvr95_ch15",
    "label": "DVR .95 (Dahua) · Ch15",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch15_sub",
    "solo": "dvr95_ch15"
  },
  {
    "name": "dvr95_ch16",
    "label": "DVR .95 (Dahua) · Ch16",
    "group": "DVR .95 (Dahua)",
    "tile": "dvr95_ch16_sub",
    "solo": "dvr95_ch16"
  },
  {
    "name": "hik205_ch1",
    "label": "DVR .205 (Hikvision) · Ch1",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch1_sub",
    "solo": "hik205_ch1"
  },
  {
    "name": "hik205_ch2",
    "label": "DVR .205 (Hikvision) · Ch2",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch2_sub",
    "solo": "hik205_ch2"
  },
  {
    "name": "hik205_ch3",
    "label": "DVR .205 (Hikvision) · Ch3",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch3_sub",
    "solo": "hik205_ch3"
  },
  {
    "name": "hik205_ch4",
    "label": "DVR .205 (Hikvision) · Ch4",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch4_sub",
    "solo": "hik205_ch4"
  },
  {
    "name": "hik205_ch5",
    "label": "DVR .205 (Hikvision) · Ch5",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch5_sub",
    "solo": "hik205_ch5"
  },
  {
    "name": "hik205_ch6",
    "label": "DVR .205 (Hikvision) · Ch6",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch6_sub",
    "solo": "hik205_ch6"
  },
  {
    "name": "hik205_ch7",
    "label": "DVR .205 (Hikvision) · Ch7",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch7_sub",
    "solo": "hik205_ch7"
  },
  {
    "name": "hik205_ch8",
    "label": "DVR .205 (Hikvision) · Ch8",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch8_sub",
    "solo": "hik205_ch8"
  },
  {
    "name": "hik205_ch9",
    "label": "DVR .205 (Hikvision) · Ch9",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch9_sub",
    "solo": "hik205_ch9"
  },
  {
    "name": "hik205_ch10",
    "label": "DVR .205 (Hikvision) · Ch10",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch10_sub",
    "solo": "hik205_ch10"
  },
  {
    "name": "hik205_ch11",
    "label": "DVR .205 (Hikvision) · Ch11",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch11_sub",
    "solo": "hik205_ch11"
  },
  {
    "name": "hik205_ch12",
    "label": "DVR .205 (Hikvision) · Ch12",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch12_sub",
    "solo": "hik205_ch12"
  },
  {
    "name": "hik205_ch13",
    "label": "DVR .205 (Hikvision) · Ch13",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch13_sub",
    "solo": "hik205_ch13"
  },
  {
    "name": "hik205_ch14",
    "label": "DVR .205 (Hikvision) · Ch14",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch14_sub",
    "solo": "hik205_ch14"
  },
  {
    "name": "hik205_ch15",
    "label": "DVR .205 (Hikvision) · Ch15",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch15_sub",
    "solo": "hik205_ch15"
  },
  {
    "name": "hik205_ch16",
    "label": "DVR .205 (Hikvision) · Ch16",
    "group": "DVR .205 (Hikvision)",
    "tile": "hik205_ch16_sub",
    "solo": "hik205_ch16"
  },
  {
    "name": "hik206_ch1",
    "label": "DVR .206 (Hikvision) · Ch1",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch1_sub",
    "solo": "hik206_ch1"
  },
  {
    "name": "hik206_ch2",
    "label": "DVR .206 (Hikvision) · Ch2",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch2_sub",
    "solo": "hik206_ch2"
  },
  {
    "name": "hik206_ch3",
    "label": "DVR .206 (Hikvision) · Ch3",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch3_sub",
    "solo": "hik206_ch3"
  },
  {
    "name": "hik206_ch4",
    "label": "DVR .206 (Hikvision) · Ch4",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch4_sub",
    "solo": "hik206_ch4"
  },
  {
    "name": "hik206_ch5",
    "label": "DVR .206 (Hikvision) · Ch5",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch5_sub",
    "solo": "hik206_ch5"
  },
  {
    "name": "hik206_ch6",
    "label": "DVR .206 (Hikvision) · Ch6",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch6_sub",
    "solo": "hik206_ch6"
  },
  {
    "name": "hik206_ch7",
    "label": "DVR .206 (Hikvision) · Ch7",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch7_sub",
    "solo": "hik206_ch7"
  },
  {
    "name": "hik206_ch8",
    "label": "DVR .206 (Hikvision) · Ch8",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch8_sub",
    "solo": "hik206_ch8"
  },
  {
    "name": "hik206_ch9",
    "label": "DVR .206 (Hikvision) · Ch9",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch9_sub",
    "solo": "hik206_ch9"
  },
  {
    "name": "hik206_ch10",
    "label": "DVR .206 (Hikvision) · Ch10",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch10_sub",
    "solo": "hik206_ch10"
  },
  {
    "name": "hik206_ch11",
    "label": "DVR .206 (Hikvision) · Ch11",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch11_sub",
    "solo": "hik206_ch11"
  },
  {
    "name": "hik206_ch12",
    "label": "DVR .206 (Hikvision) · Ch12",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch12_sub",
    "solo": "hik206_ch12"
  },
  {
    "name": "hik206_ch13",
    "label": "DVR .206 (Hikvision) · Ch13",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch13_sub",
    "solo": "hik206_ch13"
  },
  {
    "name": "hik206_ch14",
    "label": "DVR .206 (Hikvision) · Ch14",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch14_sub",
    "solo": "hik206_ch14"
  },
  {
    "name": "hik206_ch15",
    "label": "DVR .206 (Hikvision) · Ch15",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch15_sub",
    "solo": "hik206_ch15"
  },
  {
    "name": "hik206_ch16",
    "label": "DVR .206 (Hikvision) · Ch16",
    "group": "DVR .206 (Hikvision)",
    "tile": "hik206_ch16_sub",
    "solo": "hik206_ch16"
  },
  {
    "name": "hik217_ch1",
    "label": "DVR .217 (Hikvision) · Ch1",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch1_sub",
    "solo": "hik217_ch1"
  },
  {
    "name": "hik217_ch2",
    "label": "DVR .217 (Hikvision) · Ch2",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch2_sub",
    "solo": "hik217_ch2"
  },
  {
    "name": "hik217_ch3",
    "label": "DVR .217 (Hikvision) · Ch3",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch3_sub",
    "solo": "hik217_ch3"
  },
  {
    "name": "hik217_ch4",
    "label": "DVR .217 (Hikvision) · Ch4",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch4_sub",
    "solo": "hik217_ch4"
  },
  {
    "name": "hik217_ch5",
    "label": "DVR .217 (Hikvision) · Ch5",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch5_sub",
    "solo": "hik217_ch5"
  },
  {
    "name": "hik217_ch6",
    "label": "DVR .217 (Hikvision) · Ch6",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch6_sub",
    "solo": "hik217_ch6"
  },
  {
    "name": "hik217_ch7",
    "label": "DVR .217 (Hikvision) · Ch7",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch7_sub",
    "solo": "hik217_ch7"
  },
  {
    "name": "hik217_ch8",
    "label": "DVR .217 (Hikvision) · Ch8",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch8_sub",
    "solo": "hik217_ch8"
  },
  {
    "name": "hik217_ch9",
    "label": "DVR .217 (Hikvision) · Ch9",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch9_sub",
    "solo": "hik217_ch9"
  },
  {
    "name": "hik217_ch10",
    "label": "DVR .217 (Hikvision) · Ch10",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch10_sub",
    "solo": "hik217_ch10"
  },
  {
    "name": "hik217_ch11",
    "label": "DVR .217 (Hikvision) · Ch11",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch11_sub",
    "solo": "hik217_ch11"
  },
  {
    "name": "hik217_ch12",
    "label": "DVR .217 (Hikvision) · Ch12",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch12_sub",
    "solo": "hik217_ch12"
  },
  {
    "name": "hik217_ch13",
    "label": "DVR .217 (Hikvision) · Ch13",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch13_sub",
    "solo": "hik217_ch13"
  },
  {
    "name": "hik217_ch14",
    "label": "DVR .217 (Hikvision) · Ch14",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch14_sub",
    "solo": "hik217_ch14"
  },
  {
    "name": "hik217_ch15",
    "label": "DVR .217 (Hikvision) · Ch15",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch15_sub",
    "solo": "hik217_ch15"
  },
  {
    "name": "hik217_ch16",
    "label": "DVR .217 (Hikvision) · Ch16",
    "group": "DVR .217 (Hikvision)",
    "tile": "hik217_ch16_sub",
    "solo": "hik217_ch16"
  }
];
