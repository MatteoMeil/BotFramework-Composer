// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import moment from 'moment';
import formatMessage from 'format-message';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import React, { useState, Fragment, useMemo, useRef } from 'react';
import { Dropdown, IDropdownOption } from 'office-ui-fabric-react/lib/Dropdown';
import { Spinner, SpinnerSize } from 'office-ui-fabric-react/lib/Spinner';
import { PublishResult } from '@bfc/shared';
import { CheckboxVisibility, DetailsList } from 'office-ui-fabric-react/lib/DetailsList';
import { ActionButton, IconButton } from 'office-ui-fabric-react/lib/Button';
import { SharedColors } from '@uifabric/fluent-theme';
import { FontSizes } from '@uifabric/styling';
import get from 'lodash/get';
import { useCopyToClipboard } from '@bfc/ui-shared';
import { Callout } from 'office-ui-fabric-react/lib/Callout';

import { ApiStatus } from '../../utils/publishStatusPollingUpdater';

import { PublishStatusList } from './PublishStatusList';
import { detailList, listRoot, tableView } from './styles';
import { BotPublishHistory, BotStatus } from './type';

const copiedCalloutStyles = {
  root: {
    padding: '10px',
  },
};

type SkillManifestUrlFieldProps = {
  url: string;
};

const SkillManifestUrlField = ({ url }: SkillManifestUrlFieldProps) => {
  const { isCopiedToClipboard, copyTextToClipboard, resetIsCopiedToClipboard } = useCopyToClipboard(url);

  const calloutTarget = useRef<HTMLElement>();
  return (
    <Fragment>
      <ActionButton
        className="skill-manifest-copy-button"
        title={url}
        onClick={(e) => {
          calloutTarget.current = e.target as HTMLElement;
          copyTextToClipboard();
        }}
      >
        {formatMessage('Copy Skill Manifest URL')}
      </ActionButton>
      {isCopiedToClipboard && (
        <Callout
          setInitialFocus
          calloutMaxWidth={200}
          styles={copiedCalloutStyles}
          target={calloutTarget.current}
          onDismiss={resetIsCopiedToClipboard}
        >
          {formatMessage('Skill manifest URL was copied to the clipboard')}
        </Callout>
      )}
    </Fragment>
  );
};

export type BotStatusListProps = {
  botStatusList: BotStatus[];
  botPublishHistoryList: BotPublishHistory;

  /** When set to true, disable the checkbox. */
  disableCheckbox: boolean;
  onManagePublishProfile: (skillId: string) => void;
  checkedIds: string[];
  onCheck: (skillIds: string[]) => void;
  onChangePublishTarget: (PublishTarget: string, item: BotStatus) => void;
  onRollbackClick: (selectedVersion: PublishResult, item: BotStatus) => void;
};

export const BotStatusList: React.FC<BotStatusListProps> = ({
  botStatusList,
  botPublishHistoryList,
  disableCheckbox,
  checkedIds,
  onCheck,
  onManagePublishProfile,
  onChangePublishTarget,
  onRollbackClick,
}) => {
  const [expandedBotIds, setExpandedBotIds] = useState<Record<string, boolean>>({});
  const [currentSort, setSort] = useState({ key: 'Bot', descending: true });

  const displayedItems: BotStatus[] = useMemo(() => {
    if (currentSort.key !== 'Bot' || currentSort.descending) {
      return botStatusList.slice();
    }
    return botStatusList.slice().reverse();
  }, [botStatusList, currentSort]);

  const getPublishTargetOptions = (item: BotStatus): IDropdownOption[] => {
    const options: IDropdownOption[] = [];
    item.publishTargets &&
      item.publishTargets.forEach((target, index) => {
        options.push({
          key: target.name,
          text: target.name,
        });
      });
    options.push({
      key: 'manageProfiles',
      text: formatMessage('Manage profiles'),
      data: { style: { color: '#0078D4' } },
    });
    return options;
  };

  const onChangeCheckbox = (skillId: string, isChecked?: boolean) => {
    if (isChecked) {
      if (checkedIds.some((id) => id === skillId)) return;
      onCheck([...checkedIds, skillId]);
    } else {
      onCheck(checkedIds.filter((id) => id !== skillId));
    }
  };

  const isDropdownFocusEvent = (event: React.FormEvent<HTMLDivElement>) => event.type === 'focus';

  const handleChangePublishTarget = (
    event: React.FormEvent<HTMLDivElement>,
    item: BotStatus,
    option?: IDropdownOption
  ): void => {
    if (option) {
      if (option.key === 'manageProfiles') {
        // Focus events trigger onChange when no option selected
        // This prevents navigation on focus events
        if (isDropdownFocusEvent(event)) return;
        onManagePublishProfile(item.id);
      } else {
        onChangePublishTarget(option.text, item);
      }
    }
  };

  const onChangeShowHistoryBots = (item: BotStatus) => {
    const clickedBotId = item.id;
    if (expandedBotIds[clickedBotId]) {
      setExpandedBotIds({ ...expandedBotIds, [clickedBotId]: false });
    } else {
      setExpandedBotIds({ ...expandedBotIds, [clickedBotId]: true });
    }
  };

  const renderDropdownOption = (option?: IDropdownOption): JSX.Element | null => {
    if (!option) return null;
    const style = {
      ...option.data?.style,
      width: '80%',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    };
    return <div style={style}>{option.text}</div>;
  };

  const renderPublishStatus = (item: BotStatus): JSX.Element | null => {
    if (!item.status) {
      return null;
    } else if (item.status === ApiStatus.Success) {
      return <Icon iconName="Accept" style={{ color: SharedColors.green10, fontWeight: 600 }} />;
    } else if (item.status === ApiStatus.Publishing) {
      return (
        <div style={{ display: 'flex' }}>
          <Spinner size={SpinnerSize.small} />
        </div>
      );
    } else {
      return <Icon iconName="Cancel" style={{ color: SharedColors.red10, fontWeight: 600 }} />;
    }
  };

  const columns = [
    {
      key: 'Bot',
      name: formatMessage('Bot'),
      className: 'publishName',
      fieldName: 'name',
      minWidth: 100,
      maxWidth: 200,
      isRowHeader: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return (
          <Checkbox
            checked={checkedIds.includes(item.id)}
            disabled={disableCheckbox}
            label={item.name}
            styles={{
              label: { width: '100%' },
              text: {
                width: 'calc(100% - 25px)',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              },
            }}
            onChange={(_, isChecked) => onChangeCheckbox(item.id, isChecked)}
          />
        );
      },
      isPadded: true,
    },
    {
      key: 'PublishTarget',
      name: formatMessage('Publish target'),
      className: 'publishTarget',
      fieldName: 'target',
      minWidth: 150,
      maxWidth: 200,
      isRowHeader: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return (
          <Dropdown
            options={getPublishTargetOptions(item)}
            placeholder={formatMessage('Select a publish target')}
            selectedKey={item.publishTarget}
            styles={{
              root: { width: '100%' },
              dropdownItems: { selectors: { '.ms-Button-flexContainer': { width: '100%' } } },
            }}
            onChange={(event, option?: IDropdownOption) => handleChangePublishTarget(event, item, option)}
            onRenderOption={renderDropdownOption}
          />
        );
      },
      isPadded: true,
    },
    {
      key: 'PublishDate',
      name: formatMessage('Date'),
      className: 'publishDate',
      fieldName: 'date',
      minWidth: 114,
      maxWidth: 134,
      isRowHeader: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return <span>{item.time ? moment(item.time).format('MM-DD-YYYY') : null}</span>;
      },
      isPadded: true,
    },
    {
      key: 'PublishStatus',
      name: formatMessage('Status'),
      className: 'publishStatus',
      fieldName: 'status',
      minWidth: 114,
      maxWidth: 134,
      isRowHeader: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return renderPublishStatus(item);
      },
      isPadded: true,
    },
    {
      key: 'PublishMessage',
      name: formatMessage('Message'),
      className: 'publishMessage',
      fieldName: 'message',
      minWidth: 150,
      maxWidth: 300,
      isRowHeader: true,
      isCollapsible: true,
      isMultiline: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return <span>{item.message}</span>;
      },
      isPadded: true,
    },
    {
      key: 'PublishComment',
      name: formatMessage('Comment'),
      className: 'comment',
      fieldName: 'comment',
      minWidth: 150,
      maxWidth: 300,
      isRowHeader: true,
      isCollapsible: true,
      isMultiline: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return <span>{item.comment}</span>;
      },
      isPadded: true,
    },
    {
      key: 'SkillManifest',
      name: '',
      className: 'skillManifest',
      fieldName: 'skillManifestUrl',
      minWidth: 134,
      maxWidth: 150,
      data: 'string',
      onRender: (item: BotStatus) => {
        return item?.skillManifestUrl && <SkillManifestUrlField url={item.skillManifestUrl} />;
      },
      isPadded: true,
    },
    {
      key: 'ShowPublishHistory',
      name: '',
      className: 'showHistory',
      fieldName: 'showHistory',
      minWidth: 150,
      maxWidth: 300,
      isRowHeader: true,
      isCollapsible: true,
      isMultiline: true,
      data: 'string',
      onRender: (item: BotStatus) => {
        return (
          <IconButton
            iconProps={{ iconName: expandedBotIds[item.id] ? 'ChevronDown' : 'ChevronRight' }}
            styles={{ root: { float: 'right' } }}
            onClick={() => onChangeShowHistoryBots(item)}
          />
        );
      },
      isPadded: true,
    },
  ];

  const renderTableRow = (props, defaultRender) => {
    const { item }: { item: BotStatus } = props;
    const publishStatusList: PublishResult[] = get(botPublishHistoryList, [item.id, item.publishTarget || ''], []);
    const handleRollbackClick = (selectedVersion) => {
      onRollbackClick(selectedVersion, item);
    };
    return (
      <Fragment>
        {defaultRender(props)}
        <div css={{ display: expandedBotIds[item.id] ? 'block' : 'none', margin: '20px 0 38px 12px' }}>
          <div css={{ fontSize: '14px', lineHeight: '20px', color: '#323130', fontWeight: 'bold' }}>
            Publish history
          </div>
          {publishStatusList.length === 0 ? (
            <div style={{ fontSize: FontSizes.small, margin: '20px 0 0 50px' }}>No publish history</div>
          ) : (
            <PublishStatusList
              isRollbackSupported={false}
              items={publishStatusList}
              onRollbackClick={handleRollbackClick}
            />
          )}
        </div>
      </Fragment>
    );
  };

  return (
    <div css={listRoot} data-testid={'bot-status-list'}>
      <div css={tableView}>
        <DetailsList
          isHeaderVisible
          checkboxVisibility={CheckboxVisibility.hidden}
          columns={columns.map((col) => ({
            ...col,
            isSorted: col.key === currentSort.key,
            isSortedDescending: currentSort.descending,
          }))}
          css={detailList}
          items={displayedItems}
          styles={{ root: { selectors: { '.ms-DetailsRow-fields': { display: 'flex', alignItems: 'center' } } } }}
          onColumnHeaderClick={(_, clickedCol) => {
            if (!clickedCol) return;
            if (clickedCol.key === currentSort.key) {
              clickedCol.isSortedDescending = !currentSort.descending;
              setSort({ key: clickedCol.key, descending: !currentSort.descending });
            } else {
              clickedCol.isSorted = false;
            }
          }}
          onRenderRow={renderTableRow}
        />
      </div>
    </div>
  );
};
