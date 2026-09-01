import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from "react-native";
import { ThemeInput } from "@/components";
import { fontFamily, useTheme, type Theme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useDebounce } from "@/utils/hooks";
import IconSearch from "../icons/IconSearch";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import EmptyView from "../ui/empty-view";
import { Button } from "../ui/button";

interface SearchItem {
  id: string;
  name: string;
  type?: string;
  description?: string;
  strength?: string | null;
  dosage?: string | null;
}

interface SearchModalProps {
  onSelect?: (item: SearchItem | null) => void;
  placeholder?: string;
  items?: SearchItem[];
  emptyMessage?: string;
  onSearch?: (query: string) => Promise<SearchItem[]>;
  debounceDelay?: number;
  minSearchLength?: number;
}

/**
 * SearchModal Component with Debounced API Support
 */
export default function SearchModal({
  onSelect,
  placeholder,
  items,
  onSearch,
  debounceDelay = 300,
  minSearchLength = 2,
}: SearchModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const themedStyles = createStyles(theme);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>(items ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, debounceDelay);

  // Handle search logic
  useEffect(() => {
    if (!onSearch) {
      // Client-side filtering - FIXED: Use ?? instead of ??
      if (items) {
        if (searchQuery) {
          const filtered = items.filter(
            (item) =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase()) ??
              item.type?.toLowerCase().includes(searchQuery.toLowerCase()) ??
              item.description?.toLowerCase().includes(searchQuery.toLowerCase()),
          );
          setSearchResults(filtered);
        } else {
          setSearchResults(items);
        }
      }
      return;
    }

    // API search with debounce
    const performSearch = async () => {
      if (debouncedQuery.length < minSearchLength) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await onSearch(debouncedQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (debouncedQuery) {
      performSearch();
    } else {
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [debouncedQuery, onSearch, items, searchQuery, minSearchLength]);

  const handleSelectItem = useCallback(
    (item: SearchItem | null) => {
      onSelect?.(item);
      setSearchQuery("");
      setSearchResults(items ?? []);
    },
    [onSelect, items],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(items ?? []);
    setError(null);
  }, [items]);

  const renderItem = useCallback(
    ({ item }: { item: SearchItem }) => (
      <TouchableOpacity
        style={themedStyles.listItem}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.name}`}
      >
        <View style={themedStyles.listItemContent}>
          <Text style={themedStyles.itemName}>{item.name}</Text>
        </View>
        <Text style={themedStyles.addItemText}>
          {t(LocalizedStrings.schedule.placeHolders.add)}
        </Text>
      </TouchableOpacity>
    ),
    [handleSelectItem, themedStyles, theme.colors.text.secondary, t],
  );

  const keyExtractor = useCallback((item: SearchItem) => item.id, []);

  return (
    <View style={themedStyles.container}>
      <ThemeInput
        placeholder={placeholder ?? `${t(LocalizedStrings.schedule.placeHolders.search)}...`}
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={<IconSearch />}
        rightIcon={
          isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : searchQuery ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons
                name="close-circle"
                size={moderateScale(18)}
                color={theme.colors.text.hint}
              />
            </TouchableOpacity>
          ) : undefined
        }
        containerStyle={themedStyles.searchContainer}
        placeholderClassName="text-[#B3B3B3] text-xs font-normal"
        returnKeyType="search"
      />

      <FlatList
        data={searchResults}
        style={{ maxHeight: verticalScale(300) }}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={themedStyles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyView
            showButton
            buttonTitle={t(LocalizedStrings.product.no_data.buttonTitle)}
            title={t(LocalizedStrings.product.no_data.title)}
            message={t(LocalizedStrings.product.no_data.description)}
            onPressButton={() => handleSelectItem(null)}
          />
        }
        keyboardShouldPersistTaps="handled"
      />
      {searchResults.length > 0 ? (
        <Button
          size="small"
          fullWidth={false}
          style={themedStyles.button}
          textStyle={themedStyles.buttonText}
          variant="outline"
          title={t(LocalizedStrings.product.no_data.buttonTitle)}
          onPress={() => handleSelectItem(null)}
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    searchContainer: {
      marginBottom: theme.spacing.md,
      borderColor: theme.colors.black,
      padding: 0,
      height: verticalScale(40),
    },
    listContent: {
      paddingBottom: theme.spacing.lg,
    },
    addItemText: {
      borderRadius: moderateScale(5),
      backgroundColor: theme.colors.slateCharcoal,
      color: theme.colors.white,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      fontSize: moderateScale(12),
      fontFamily: fontFamily.manrope.medium,
      fontWeight: "bold",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.smd,
    },
    listItemContent: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    itemName: {
      color: theme.colors.text.primary,
      fontFamily: fontFamily.manrope.bold,
      fontSize: moderateScale(16),
      fontWeight: "bold",
      lineHeight: verticalScale(24),
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: verticalScale(theme.spacing.xxxl * 2),
    },
    emptyText: {
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.error.main,
      textAlign: "center",
      marginTop: theme.spacing.lg,
    },
    button: {
      alignSelf: "center",
      borderColor: theme.colors.text.primary,
    },
    buttonText: {
      color: theme.colors.text.primary,
    },
  });
