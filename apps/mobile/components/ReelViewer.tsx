import type { Clip, ClipVerse } from "@bibleclips/database";
import { useCallback, useRef, useState } from "react";
import { FlatList, useWindowDimensions, type ViewToken } from "react-native";
import { useVotes } from "@/hooks/useVotes";
import { ReelItem } from "./ReelItem";

type ClipWithVerse = Clip & { clip_verses: ClipVerse[] };

interface ReelViewerProps {
  clips: ClipWithVerse[];
}

export function ReelViewer({ clips }: ReelViewerProps) {
  const { height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const { votedClipIds, toggleVote } = useVotes();
  const flatListRef = useRef<FlatList>(null);

  const scrollToNext = useCallback(
    (index: number) => {
      if (index < clips.length - 1) {
        flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
      }
    },
    [clips.length]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: ClipWithVerse; index: number }) => (
      <ReelItem
        clip={item}
        isActive={index === activeIndex}
        hasVoted={votedClipIds.has(item.id)}
        onVote={() => toggleVote(item.id)}
        onEnded={() => scrollToNext(index)}
      />
    ),
    [activeIndex, votedClipIds, toggleVote, scrollToNext]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={clips}
      renderItem={renderItem}
      extraData={activeIndex}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      windowSize={3}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
}
