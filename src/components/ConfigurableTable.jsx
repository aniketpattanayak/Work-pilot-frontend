import React from 'react';
import useConfigurableColumns from '../hooks/useConfigurableColumns';
import ColumnCustomizer from './ColumnCustomizer';

/**
 * A grid table whose columns are the screen's built-in ones + the company's custom fields,
 * arranged by the saved layout, with a "Columns" button to change it.
 *
 *  tableKey, columns[{key,label,width,render(row,index),headerClassName,pinEnd,locked}], customFieldEntity
 *  rows, rowKey(row)
 *  renderHeader({cells, style}) / renderRow({row,index,cells,style})  - let a page keep its own markup/classes
 *  controller         - pass the result of useConfigurableColumns when the page draws the Columns button itself
 *  hideToolbar        - do not draw the Columns button here
 *  ownScroll          - true to give the table its own sideways scrollbar (breaks a sticky header; default false: the parent scrolls)
 *  rowsClassName      - class for the element that holds the rows (e.g. 'space-y-2')
 *  minWidthClass      - the breakpoint from which the grid keeps a pixel floor and scrolls sideways
 * With no custom fields and no saved layout this draws just the built-in columns.
 */
export default function ConfigurableTable({
  tableKey, columns, customFieldEntity, rows, rowKey, renderHeader, renderRow, empty, minWidthClass = 'xl:min-w-[var(--cfg-min)]',
  controller, hideToolbar = false, phoneUsesDefaults = false, ownScroll = false, rowsClassName = '', headerClassName = '', rowClassName = '',
}) {
  const own = useConfigurableColumns({ tableKey, columns, customFieldEntity, phoneUsesDefaults });
  const ctl = controller || own;
  const style = { gridTemplateColumns: ctl.gridTemplate };
  const list = Array.isArray(rows) ? rows : [];

  const headCells = ctl.columns.map((c) => <div key={c.key} className={c.headerClassName || ''}>{c.label}</div>);
  const header = renderHeader
    ? renderHeader({ cells: headCells, style })
    : <div className={`grid items-center ${headerClassName}`} style={style}>{headCells}</div>;

  return (
    <>
      {!hideToolbar && !controller && (
        <div className="hidden xl:flex justify-end mb-2"><ColumnCustomizer ctl={ctl} /></div>
      )}
      <div className={ownScroll ? 'overflow-x-auto' : ''}>
        <div className={minWidthClass} style={{ '--cfg-min': `${ctl.minWidth}px` }}>
          {header}
          <div className={rowsClassName}>
          {list.length === 0 ? (empty || null) : list.map((row, index) => {
            const cells = ctl.columns.map((c) => (
              <div key={c.key} className={c.cellClassName || 'min-w-0 text-xs font-semibold'} data-col={c.key}>{c.render ? c.render(row, index) : null}</div>
            ));
            return renderRow
              ? <React.Fragment key={rowKey ? rowKey(row) : index}>{renderRow({ row, index, cells, style })}</React.Fragment>
              : <div key={rowKey ? rowKey(row) : index} className={`grid items-center ${rowClassName}`} style={style}>{cells}</div>;
          })}
          </div>
        </div>
      </div>
    </>
  );
}
