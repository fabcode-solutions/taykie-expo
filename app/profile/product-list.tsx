import { SafeAreaScreen, ThemeText } from "@/components";
import IconBackArrow from "@/components/icons/IconBackArrow";
import AddProduct, { ProductDetails } from "@/components/schedule/AddProduct";
import { Loader } from "@/components/shared/loader";
import EmptyView from "@/components/ui/empty-view";
import BlurModal from "@/components/ui/Modal";
import { LocalizedStrings } from "@/i18n/LocalizedStrings";
import { useAlert } from "@/provider/AlertProvider";
import { useProductStore } from "@/stores/productStore";
import { fontFamily, Theme, useTheme } from "@/theme";
import { Medication, ProductRequest } from "@/types/products.types";
import { AlertPresets } from "@/utils/alert";
import { moderateScale, scale, verticalScale } from "@/utils/scale";
import { router } from "expo-router";
import { t } from "i18next";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ProductList = () => {
  const theme = useTheme();
  const alert = useAlert();
  const [editVisible, setEditVisible] = useState(false);
  const [selectedProduct, setSelectedproduct] = useState<Medication | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { fetchUserProducts, userProducts, updateProduct, isLoading, hasMore } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);

  const fetchProducts = useCallback(async (isRefresh?: boolean) => {
    try {
      await fetchUserProducts(isRefresh);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProducts(true);
    setIsRefreshing(false);
  }, [fetchProducts]);

  const handleUpdateProduct = useCallback(
    async (product: ProductDetails) => {
      try {
        const request: ProductRequest = {
          name: product.productName,
          dosage: `${product.dosageCount} ${Number(product.dosageCount) > 1 ? "Tablets" : "Tablet"}`,
          strength: `${product.strength} mg`,
          ...(product.description && { description: product.description }),
          ...(product.type && { type: product.type }),
        };
        if (selectedProduct?.id) {
          const message = await updateProduct(selectedProduct?.id, request);
          Alert.alert(t(LocalizedStrings.common.success), message, [
            {
              text: t(LocalizedStrings.common.ok),
              onPress: () => setEditVisible(false),
            },
          ]);
        }
      } catch (error) {
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), error.message));
      }
    },
    [selectedProduct, t],
  );

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchProducts(false);
  }, [isLoading, hasMore]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item?.id?.toString() || `fallback-${index}`,
    [],
  );

  return (
    <SafeAreaScreen style={styles.safeArea}>
      <View>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
      </View>

      <ThemeText variant="manrope.h2" style={styles.header}>
        {t(LocalizedStrings.product.myProducts)}
      </ThemeText>
      <FlatList
        data={userProducts}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        extraData={userProducts}
        showsVerticalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <ProductItem
            name={item.name}
            onEdit={() => {
              setSelectedproduct(item);
              setEditVisible(true);
            }}
          />
        )}
        contentContainerStyle={{ gap: verticalScale(16) }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isLoading ? <Loader fullScreen={false} size="small" /> : null}
        ListEmptyComponent={<EmptyView message={t(LocalizedStrings.product.no_product_found)} />}
      />

      <BlurModal
        heading={t(LocalizedStrings.home.extras.updateProduct)}
        visible={editVisible}
        onRequestClose={() => setEditVisible(false)}
      >
        {isLoading && <Loader />}
        <AddProduct
          item={selectedProduct}
          initialDosage={parseInt((selectedProduct?.dosage ?? "1 Tablet")?.split(" ")[0])}
          initialStrength={parseInt((selectedProduct?.strength ?? "500 mg")?.split(" ")[0])}
          onAddProduct={(product) => handleUpdateProduct(product)}
        />
      </BlurModal>
    </SafeAreaScreen>
  );
};
const ProductItem = memo(({ name, onEdit }: { name: string; onEdit: () => void }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, styles.row, styles.border]}>
      <ThemeText variant="manrope.body2Bold">{name}</ThemeText>
      <TouchableOpacity style={styles.editButton} onPress={onEdit}>
        <Text style={styles.editButtonText}>{t(LocalizedStrings.common.edit)}</Text>
      </TouchableOpacity>
    </View>
  );
});

ProductItem.displayName = "ProductItem";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      gap: verticalScale(30),
      padding: verticalScale(25),
      paddingBottom: 0,
    },
    container: {
      justifyContent: "space-between",
      padding: verticalScale(20),
      backgroundColor: theme.colors.background.elevated,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    header: {
      fontSize: moderateScale(24),
      fontWeight: "400" as const,
      fontFamily: fontFamily.gascogneSerial.regular,
      color: theme.colors.text.primary,
      margin: 0,
    },
    border: {
      borderWidth: scale(1),
      borderColor: theme.colors.border,
      borderRadius: moderateScale(10),
    },
    backButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
      borderWidth: scale(1),
      borderColor: theme.colors.slateCharcoal,
      justifyContent: "center",
      alignItems: "center",
    },
    backButtonInner: {
      aspectRatio: 1,
      height: verticalScale(16),
      justifyContent: "center",
      alignItems: "center",
    },
    editButtonText: {
      color: theme.colors.white,
      fontSize: moderateScale(12),
      fontWeight: "500" as const,
      fontFamily: fontFamily.manrope.medium,
    },
    editButton: {
      backgroundColor: theme.colors.slateCharcoal,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      borderRadius: moderateScale(5),
    },
  });
export default ProductList;
