import { v1 as uuid } from 'uuid';
import * as React from 'react';

export function useComponentId() {
    const idRef = React.useRef(uuid());
    return idRef.current;
}
