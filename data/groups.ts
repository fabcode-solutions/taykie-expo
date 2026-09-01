import { Images } from "@/assets";
import { ImageSourcePropType } from "react-native";

export interface GROUPSProps {
  icon: ImageSourcePropType;
  title: string;
  description: string;
  members: {
    image: ImageSourcePropType;
    name: string;
  }[];
}

export const GROUPS: GROUPSProps[] = [
  {
    icon: Images.caps7,
    title: "Vital Boost Tribe",
    description: `A community for health enthusiasts sharing tips, experiences, and insights about vitamins and supplements. Boost your wellness and energy with science-backed advice.`,
    members: [
      {
        image: Images.authStart,
        name: "Robert",
      },
      {
        image: Images.welcomeScreen,
        name: "Emily",
      },
      {
        image: Images.user,
        name: "John",
      },
    ],
  },
  {
    icon: Images.caps7,
    title: "Vital Boost Tribe",
    description: `A community for health enthusiasts sharing tips, experiences, and insights about vitamins and supplements. Boost your wellness and energy with science-backed advice.`,
    members: [
      {
        image: Images.authStart,
        name: "Robert",
      },
      {
        image: Images.welcomeScreen,
        name: "Emily",
      },
      {
        image: Images.user,
        name: "John",
      },
    ],
  },
  {
    icon: Images.caps7,
    title: "Vital Boost Tribe",
    description: `A community for health enthusiasts sharing tips, experiences, and insights about vitamins and supplements. Boost your wellness and energy with science-backed advice.`,
    members: [
      {
        image: Images.authStart,
        name: "Robert",
      },
      {
        image: Images.welcomeScreen,
        name: "Emily",
      },
      {
        image: Images.user,
        name: "John",
      },
    ],
  },
];
export const REC_GROUPS = [
  {
    icon: Images.caps7,
    title: "Diabetes Support",
    members: 18,
  },
  {
    icon: Images.gym,
    title: "Fitness Motivation",
    members: 15,
  },
  {
    icon: Images.mind,
    title: "Mental Wellbeing",
    members: 9,
  },
  {
    icon: Images.food,
    title: "Nutrition",
    members: 25,
  },
];
