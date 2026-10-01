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
import { catalogRequestFields } from "@/utils/supplementCatalog";
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
import { Ionicons } from "@expo/vector-icons";
import { CardListSkeleton } from "@/components/profile/ProfileSkeletons";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const ProductList = () => {
  const theme = useTheme();
  const alert = useAlert();
  const [editVisible, setEditVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [selectedProduct, setSelectedproduct] = useState<Medication | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fetchUserProducts = useProductStore((s) => s.fetchUserProducts);
  const userProducts = useProductStore((s) => s.userProducts);
  const createProduct = useProductStore((s) => s.createProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);
  const deleteProductById = useProductStore((s) => s.deleteProductById);
  const isLoading = useProductStore((s) => s.isLoading);
  const hasMore = useProductStore((s) => s.hasMore);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleBack = useCallback(() => router.back(), [router]);

  const fetchProducts = useCallback(async (isRefresh?: boolean) => {
    try {
      await fetchUserProducts(isRefresh);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
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
          ...catalogRequestFields(product),
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
        alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
      }
    },
    [selectedProduct, t],
  );

  const handleCreateProduct = useCallback(async (product: ProductDetails) => {
    try {
      const request: ProductRequest = {
        name: product.productName,
        dosage: `${product.dosageCount} ${Number(product.dosageCount) > 1 ? "Tablets" : "Tablet"}`,
        ...catalogRequestFields(product),
        ...(product.description && { description: product.description }),
        ...(product.type && { type: product.type }),
      };
      await createProduct(request);
      setAddVisible(false);
    } catch (error) {
      alert.show(AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)));
    }
  }, []);

  const handleDeleteProduct = useCallback((product: Medication) => {
    Alert.alert(
      t(LocalizedStrings.product.deleteConfirmTitle),
      t(LocalizedStrings.product.deleteConfirmMessage),
      [
        { text: t(LocalizedStrings.common.cancel), style: "cancel" },
        {
          text: t(LocalizedStrings.common.delete),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProductById(product.id);
              await fetchProducts(true);
            } catch (error) {
              alert.show(
                AlertPresets.error(t(LocalizedStrings.common.error), getErrorMessage(error)),
              );
            }
          },
        },
      ],
    );
  }, []);

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    fetchProducts(false);
  }, [isLoading, hasMore]);

  const keyExtractor = useCallback(
    (item: any, index: number) => item?.id?.toString() || `fallback-${index}`,
    [],
  );

  const handleEditProduct = useCallback((item: Medication) => {
    setSelectedproduct(item);
    setEditVisible(true);
  }, []);
  const handleOpenAdd = useCallback(() => setAddVisible(true), []);

  const renderProduct = useCallback(
    ({ item }: { item: Medication }) => (
      <ProductRow item={item} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
    ),
    [handleEditProduct, handleDeleteProduct],
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />,
    [isRefreshing, handleRefresh],
  );

  return (
    <SafeAreaScreen style={styles.safeArea}>
      <View style={[styles.row, styles.headerRow]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <View style={styles.backButtonInner}>
            <IconBackArrow />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleOpenAdd}
          style={styles.addButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t(LocalizedStrings.product.addProduct)}
        >
          <Ionicons name="add" size={moderateScale(20)} color={theme.colors.black} />
        </TouchableOpacity>
      </View>

      <ThemeText variant="manrope.h2" style={styles.header}>
        {t(LocalizedStrings.product.myProducts)}
      </ThemeText>
      <FlatList
        data={userProducts}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderProduct}
        contentContainerStyle={{ gap: verticalScale(16) }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoading && userProducts.length > 0 ? (
            <CardListSkeleton variant="product" count={1} />
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <CardListSkeleton variant="product" />
          ) : (
            <EmptyView message={t(LocalizedStrings.product.no_product_found)} />
          )
        }
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

      <BlurModal
        heading={t(LocalizedStrings.product.addProduct)}
        visible={addVisible}
        onRequestClose={() => setAddVisible(false)}
      >
        {isLoading && <Loader />}
        <AddProduct item={null} onAddProduct={(product) => handleCreateProduct(product)} />
      </BlurModal>
    </SafeAreaScreen>
  );
};
// Gives each ProductItem stable onEdit/onDelete callbacks instead of per-render closures.
const ProductRow = memo(
  ({
    item,
    onEdit,
    onDelete,
  }: {
    item: Medication;
    onEdit: (item: Medication) => void;
    onDelete: (item: Medication) => void;
  }) => {
    const handleEdit = useCallback(() => onEdit(item), [onEdit, item]);
    const handleDelete = useCallback(() => onDelete(item), [onDelete, item]);
    return (
      <ProductItem
        name={item.name}
        reviewStatus={item.reviewStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  },
);

ProductRow.displayName = "ProductRow";

const ProductItem = memo(
  ({
    name,
    reviewStatus,
    onEdit,
    onDelete,
  }: {
    name: string;
    reviewStatus?: Medication["reviewStatus"];
    onEdit: () => void;
    onDelete: () => void;
  }) => {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
      <View style={[styles.container, styles.row, styles.border]}>
        <View style={styles.nameBlock}>
          <ThemeText variant="manrope.body2Bold">{name}</ThemeText>
          {(reviewStatus === "pending" || reviewStatus === "rejected") && (
            <Text style={styles.reviewStatusText}>
              {t(LocalizedStrings.product.reviewStatus[reviewStatus])}
            </Text>
          )}
        </View>
        <View style={[styles.row, { gap: verticalScale(8) }]}>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>{t(LocalizedStrings.common.edit)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={t(LocalizedStrings.common.delete)}
          >
            <Ionicons name="trash-outline" size={moderateScale(14)} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

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
    nameBlock: {
      flex: 1,
      marginRight: scale(8),
    },
    reviewStatusText: {
      fontFamily: fontFamily.manrope.regular,
      fontSize: moderateScale(12),
      color: theme.colors.text.secondary,
      marginTop: verticalScale(2),
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
    headerRow: {
      justifyContent: "space-between",
    },
    addButton: {
      aspectRatio: 1,
      height: verticalScale(40),
      borderRadius: moderateScale(10),
      backgroundColor: theme.colors.primary.main,
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
    deleteButton: {
      backgroundColor: theme.colors.error.main,
      paddingVertical: verticalScale(4),
      paddingHorizontal: scale(8),
      borderRadius: moderateScale(5),
      justifyContent: "center",
      alignItems: "center",
    },
  });
export default ProductList;
