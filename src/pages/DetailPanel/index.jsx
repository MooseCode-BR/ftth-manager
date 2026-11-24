/*
 * Roteador fino dos Painéis de Detalhes do FTTH Manager Cloud.
 * Direciona cada tipo de elemento para o seu painel dedicado:
 * - CABLE         -> CableDetailPanel  (coluna única com Lado A ↔ Lado B, fibras e sinais)
 * - POP           -> PopDetailPanel    (OLT, DIO, Switch, PoE, Router, Câmera, Splitter, Cabos)
 * - TOWER         -> TowerDetailPanel  (dedicado exclusivamente à Torre)
 * - CEO / CTO / … -> BoxDetailPanel    (Caixas ópticas com Splitters, Cabos e Fusões)
 */

import React from 'react';
import { DS, cn } from '../../theme/designSystem';

import CableDetailPanel from './CableDetailPanel';
import PopDetailPanel from './PopDetailPanel';
import TowerDetailPanel from './TowerDetailPanel';
import BoxDetailPanel from './BoxDetailPanel';

const DetailPanel = (props) => {
    const { itemId, items = [] } = props;
    const item = items.find((i) => i.id === itemId);

    if (!item) {
        return (
            <div className={cn('p-6 text-center', DS.text.muted)}>
                Item não encontrado.
            </div>
        );
    }

    if (item.type === 'CABLE') {
        return <CableDetailPanel {...props} item={item} />;
    }

    if (item.type === 'POP') {
        return <PopDetailPanel {...props} item={item} />;
    }

    if (item.type === 'TOWER') {
        return <TowerDetailPanel {...props} item={item} />;
    }

    return <BoxDetailPanel {...props} item={item} />;
};

export default DetailPanel;
