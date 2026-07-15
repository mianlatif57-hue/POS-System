import copy
import unittest

from mock_data import MOCK_PRODUCT_HISTORY, PRODUCTS, FakeCursor


class ProductDeleteTests(unittest.TestCase):
    def setUp(self):
        self.original_products = copy.deepcopy(PRODUCTS)
        self.original_history = copy.deepcopy(MOCK_PRODUCT_HISTORY)

    def tearDown(self):
        PRODUCTS[:] = copy.deepcopy(self.original_products)
        MOCK_PRODUCT_HISTORY[:] = copy.deepcopy(self.original_history)

    def test_delete_product_marks_product_inactive_without_removing_history(self):
        cursor = FakeCursor()

        cursor.execute("{CALL usp_DeleteProduct (1)}", (1,))

        result = cursor._rows[0]
        self.assertEqual(result["prodID"], 1)
        self.assertEqual(result["message"], "Deleted")

        deleted_product = next((p for p in PRODUCTS if p["prodID"] == 1), None)
        self.assertIsNotNone(deleted_product)
        self.assertFalse(deleted_product.get("isActive", True))
        self.assertEqual(len([p for p in PRODUCTS if p["prodID"] == 1]), 1)
        self.assertTrue(MOCK_PRODUCT_HISTORY)


if __name__ == "__main__":
    unittest.main()
