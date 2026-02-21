import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface CustomTextProps extends TextProps {
  style?: any;
  children: React.ReactNode;
}

const CustomText: React.FC<CustomTextProps> = ({ style, children, ...props }) => {
  return (
    <Text style={[styles.defaultText, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'YekanBakh',
  },
});

export default CustomText;