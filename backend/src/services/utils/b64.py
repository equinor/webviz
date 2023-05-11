import base64

import numpy as np


def b64_encode_numpy(obj):
    # Convert 1D numpy arrays with numeric types to memoryviews with
    # datatype and shape metadata.
    if len(obj) == 0:
        return obj.tolist()

    dtype = obj.dtype
    if dtype.kind in ["u", "i", "f"] and str(dtype) != "int64" and str(dtype) != "uint64":
        # We have a numpy array that is compatible with JavaScript typed
        # arrays
        buffer = base64.b64encode(memoryview(obj.ravel(order="C"))).decode("utf-8")
        return {"bvals": buffer, "dtype": str(dtype), "shape": obj.shape}
    else:
        buffer = None
        dtype_str = None
        # Try to see if we can downsize the array
        max_value = np.amax(obj)
        min_value = np.amin(obj)
        signed = min_value < 0
        test_value = max(max_value, -min_value)
        if test_value < np.iinfo(np.int16).max and signed:
            dtype_str = "int16"
            buffer = base64.b64encode(memoryview(obj.astype(np.int16).ravel(order="C"))).decode("utf-8")
        elif test_value < np.iinfo(np.int32).max and signed:
            dtype_str = "int32"
            buffer = base64.b64encode(memoryview(obj.astype(np.int32).ravel(order="C"))).decode("utf-8")
        elif test_value < np.iinfo(np.uint16).max and not signed:
            dtype_str = "uint16"
            buffer = base64.b64encode(memoryview(obj.astype(np.uint16).ravel(order="C"))).decode("utf-8")
        elif test_value < np.iinfo(np.uint32).max and not signed:
            dtype_str = "uint32"
            buffer = base64.b64encode(memoryview(obj.astype(np.uint32).ravel(order="C"))).decode("utf-8")

        if dtype:
            return {"bvals": buffer, "dtype": dtype_str, "shape": obj.shape}

    # Convert all other numpy arrays to lists
    return obj.tolist()
